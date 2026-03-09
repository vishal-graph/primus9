# ===========================================
# TatvaOps Vision - S3 Buckets Configuration
# ===========================================

# ===========================================
# Floor Plans Bucket
# ===========================================

resource "aws_s3_bucket" "floorplans" {
  bucket = "${local.name_prefix}-floorplans"

  tags = {
    Name = "${local.name_prefix}-floorplans"
    Type = "FloorPlans"
  }
}

resource "aws_s3_bucket_versioning" "floorplans" {
  bucket = aws_s3_bucket.floorplans.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "floorplans" {
  bucket = aws_s3_bucket.floorplans.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "floorplans" {
  bucket = aws_s3_bucket.floorplans.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "floorplans" {
  bucket = aws_s3_bucket.floorplans.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"] # Restrict in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# ===========================================
# Moodboards Bucket
# ===========================================

resource "aws_s3_bucket" "moodboards" {
  bucket = "${local.name_prefix}-moodboards"

  tags = {
    Name = "${local.name_prefix}-moodboards"
    Type = "Moodboards"
  }
}

resource "aws_s3_bucket_versioning" "moodboards" {
  bucket = aws_s3_bucket.moodboards.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "moodboards" {
  bucket = aws_s3_bucket.moodboards.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "moodboards" {
  bucket = aws_s3_bucket.moodboards.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===========================================
# Renders Bucket
# ===========================================

resource "aws_s3_bucket" "renders" {
  bucket = "${local.name_prefix}-renders"

  tags = {
    Name = "${local.name_prefix}-renders"
    Type = "Renders"
  }
}

resource "aws_s3_bucket_versioning" "renders" {
  bucket = aws_s3_bucket.renders.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "renders" {
  bucket = aws_s3_bucket.renders.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "renders" {
  bucket = aws_s3_bucket.renders.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===========================================
# Exports Bucket
# ===========================================

resource "aws_s3_bucket" "exports" {
  bucket = "${local.name_prefix}-exports"

  tags = {
    Name = "${local.name_prefix}-exports"
    Type = "Exports"
  }
}

resource "aws_s3_bucket_versioning" "exports" {
  bucket = aws_s3_bucket.exports.id
  versioning_configuration {
    status = "Disabled" # Exports are generated, don't need versioning
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "exports" {
  bucket = aws_s3_bucket.exports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule to delete old exports
resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    id     = "expire-old-exports"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 30 # Delete exports after 30 days
    }
  }
}

# ===========================================
# IAM Policy for S3 Access
# ===========================================

resource "aws_iam_policy" "s3_access" {
  name        = "${local.name_prefix}-s3-access"
  description = "Policy for accessing TatvaOps Vision S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBuckets"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.floorplans.arn,
          aws_s3_bucket.moodboards.arn,
          aws_s3_bucket.renders.arn,
          aws_s3_bucket.exports.arn
        ]
      },
      {
        Sid    = "ObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "${aws_s3_bucket.floorplans.arn}/*",
          "${aws_s3_bucket.moodboards.arn}/*",
          "${aws_s3_bucket.renders.arn}/*",
          "${aws_s3_bucket.exports.arn}/*"
        ]
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-s3-access"
  }
}

