# =============================================================================
# EC2 INSTANCES FOR TATVAOPS VISION
# =============================================================================
# This creates:
# - Application Load Balancer (ALB)
# - EC2 instances for Application (Frontend + Backend API)
# - EC2 instances for Worker service
# - Auto Scaling Groups for horizontal scaling
# =============================================================================

# -----------------------------------------------------------------------------
# AMI Data Source - Amazon Linux 2023
# -----------------------------------------------------------------------------
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

# -----------------------------------------------------------------------------
# Key Pair for SSH Access
# -----------------------------------------------------------------------------
resource "aws_key_pair" "main" {
  key_name   = "${local.name_prefix}-key"
  public_key = var.ssh_public_key

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-key"
  })
}

# -----------------------------------------------------------------------------
# Application Load Balancer
# -----------------------------------------------------------------------------
resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

# ALB Target Group - Frontend (Next.js on port 3000)
resource "aws_lb_target_group" "frontend" {
  name     = "tatvaops-prod-frontend"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-frontend-tg"
  })
}

# ALB Target Group - Backend API (Express on port 3001)
resource "aws_lb_target_group" "backend" {
  name     = "tatvaops-prod-backend"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-tg"
  })
}

# ALB Listener - HTTP (redirects to HTTPS in production)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ALB Listener Rule - API routes to backend
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health", "/webhooks/*"]
    }
  }
}

# -----------------------------------------------------------------------------
# Launch Template - Application Server
# -----------------------------------------------------------------------------
resource "aws_launch_template" "application" {
  name_prefix   = "${local.name_prefix}-app-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.app_instance_type

  key_name = aws_key_pair.main.key_name

  iam_instance_profile {
    arn = aws_iam_instance_profile.application.arn
  }

  vpc_security_group_ids = [aws_security_group.application.id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Update system
    dnf update -y

    # Install Docker
    dnf install -y docker
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user

    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # Install Node.js 20
    dnf install -y nodejs20 npm

    # Install Git
    dnf install -y git

    # Create app directory
    mkdir -p /opt/tatvaops
    chown ec2-user:ec2-user /opt/tatvaops

    # Install CloudWatch agent
    dnf install -y amazon-cloudwatch-agent

    # Log completion
    echo "Application server setup complete" >> /var/log/user-data.log
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-application"
      Role = "application"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-application-volume"
    })
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-template"
  })
}

# -----------------------------------------------------------------------------
# Launch Template - Worker Server
# -----------------------------------------------------------------------------
resource "aws_launch_template" "worker" {
  name_prefix   = "${local.name_prefix}-worker-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.worker_instance_type

  key_name = aws_key_pair.main.key_name

  iam_instance_profile {
    arn = aws_iam_instance_profile.worker.arn
  }

  vpc_security_group_ids = [aws_security_group.worker.id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50  # Larger for AI processing
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Update system
    dnf update -y

    # Install Docker
    dnf install -y docker
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user

    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # Install Node.js 20
    dnf install -y nodejs20 npm

    # Install Git
    dnf install -y git

    # Create app directory
    mkdir -p /opt/tatvaops
    chown ec2-user:ec2-user /opt/tatvaops

    # Install CloudWatch agent
    dnf install -y amazon-cloudwatch-agent

    # Log completion
    echo "Worker server setup complete" >> /var/log/user-data.log
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-worker"
      Role = "worker"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-worker-volume"
    })
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-worker-template"
  })
}

# -----------------------------------------------------------------------------
# Auto Scaling Group - Application
# -----------------------------------------------------------------------------
resource "aws_autoscaling_group" "application" {
  name                = "${local.name_prefix}-app-asg"
  desired_capacity    = var.app_desired_capacity
  max_size            = var.app_max_capacity
  min_size            = var.app_min_capacity
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.frontend.arn, aws_lb_target_group.backend.arn]
  health_check_type   = "ELB"

  launch_template {
    id      = aws_launch_template.application.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.name_prefix}-application"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = "TatvaOps-Vision"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Auto Scaling Group - Worker
# -----------------------------------------------------------------------------
resource "aws_autoscaling_group" "worker" {
  name                = "${local.name_prefix}-worker-asg"
  desired_capacity    = var.worker_desired_capacity
  max_size            = var.worker_max_capacity
  min_size            = var.worker_min_capacity
  vpc_zone_identifier = aws_subnet.private[*].id
  health_check_type   = "EC2"

  launch_template {
    id      = aws_launch_template.worker.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.name_prefix}-worker"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = "TatvaOps-Vision"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Auto Scaling Policies - Application
# -----------------------------------------------------------------------------
resource "aws_autoscaling_policy" "app_scale_up" {
  name                   = "${local.name_prefix}-app-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.application.name
}

resource "aws_autoscaling_policy" "app_scale_down" {
  name                   = "${local.name_prefix}-app-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.application.name
}

# CloudWatch Alarm - High CPU (Scale Up)
resource "aws_cloudwatch_metric_alarm" "app_cpu_high" {
  alarm_name          = "${local.name_prefix}-app-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "Scale up if CPU > 70%"
  alarm_actions       = [aws_autoscaling_policy.app_scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.application.name
  }

  tags = local.common_tags
}

# CloudWatch Alarm - Low CPU (Scale Down)
resource "aws_cloudwatch_metric_alarm" "app_cpu_low" {
  alarm_name          = "${local.name_prefix}-app-cpu-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "30"
  alarm_description   = "Scale down if CPU < 30%"
  alarm_actions       = [aws_autoscaling_policy.app_scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.application.name
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Auto Scaling Policies - Worker (based on SQS queue depth)
# -----------------------------------------------------------------------------
resource "aws_autoscaling_policy" "worker_scale_up" {
  name                   = "${local.name_prefix}-worker-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.worker.name
}

resource "aws_autoscaling_policy" "worker_scale_down" {
  name                   = "${local.name_prefix}-worker-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.worker.name
}

# CloudWatch Alarm - SQS Queue Depth (Scale Up Workers)
resource "aws_cloudwatch_metric_alarm" "worker_queue_high" {
  alarm_name          = "${local.name_prefix}-worker-queue-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "60"
  statistic           = "Average"
  threshold           = "10"
  alarm_description   = "Scale up workers if queue depth > 10"
  alarm_actions       = [aws_autoscaling_policy.worker_scale_up.arn]

  dimensions = {
    QueueName = aws_sqs_queue.moodboard_generation.name
  }

  tags = local.common_tags
}

# CloudWatch Alarm - SQS Queue Empty (Scale Down Workers)
resource "aws_cloudwatch_metric_alarm" "worker_queue_low" {
  alarm_name          = "${local.name_prefix}-worker-queue-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "5"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Scale down workers if queue is empty"
  alarm_actions       = [aws_autoscaling_policy.worker_scale_down.arn]

  dimensions = {
    QueueName = aws_sqs_queue.moodboard_generation.name
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Bastion Host (for SSH access to private instances)
# -----------------------------------------------------------------------------
resource "aws_instance" "bastion" {
  count = var.create_bastion ? 1 : 0

  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = "t3.micro"
  key_name                    = aws_key_pair.main.key_name
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  subnet_id                   = aws_subnet.public[0].id
  associate_public_ip_address = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-bastion"
  })
}

# Elastic IP for Bastion
resource "aws_eip" "bastion" {
  count = var.create_bastion ? 1 : 0

  instance = aws_instance.bastion[0].id
  domain   = "vpc"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-bastion-eip"
  })
}

