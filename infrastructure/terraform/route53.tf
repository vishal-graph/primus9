# =============================================================================
# ROUTE 53 DNS CONFIGURATION
# =============================================================================
# Maps vision.tatvaops.com to the Application Load Balancer
# =============================================================================

# -----------------------------------------------------------------------------
# Route 53 Hosted Zone (if managing DNS in AWS)
# -----------------------------------------------------------------------------
# Option 1: Create a new hosted zone for the subdomain
resource "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  
  name    = var.domain_name
  comment = "Hosted zone for TatvaOps Vision - ${var.environment}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-dns-zone"
  })
}

# Option 2: Use existing hosted zone (uncomment if tatvaops.com zone exists)
# data "aws_route53_zone" "main" {
#   count = var.domain_name != "" ? 1 : 0
#   name  = "tatvaops.com"
# }

# -----------------------------------------------------------------------------
# A Record - Points domain to ALB
# -----------------------------------------------------------------------------
resource "aws_route53_record" "main" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# -----------------------------------------------------------------------------
# WWW Record - Redirects www.vision.tatvaops.com to vision.tatvaops.com
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate for HTTPS
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ssl-cert"
  })
}

# DNS validation record for ACM certificate
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main[0].zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# -----------------------------------------------------------------------------
# HTTPS Listener for ALB (after certificate is validated)
# -----------------------------------------------------------------------------
resource "aws_lb_listener" "https" {
  count = var.domain_name != "" ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  depends_on = [aws_acm_certificate_validation.main]
}

# HTTPS Listener Rule - API routes to backend
resource "aws_lb_listener_rule" "api_https" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
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

# Redirect HTTP to HTTPS (update existing HTTP listener)
resource "aws_lb_listener_rule" "redirect_https" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = [var.domain_name, "www.${var.domain_name}"]
    }
  }
}

