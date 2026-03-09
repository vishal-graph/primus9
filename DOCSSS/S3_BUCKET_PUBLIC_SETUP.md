# Making Moodboards S3 Bucket Public

## ⚠️ Security Warning
Making the bucket public allows anyone with the URL to access moodboard images. Consider:
- Using CloudFront with signed URLs instead
- Keeping bucket private and fixing the backend proxy (recommended)
- Making only specific paths public

## Option 1: Make Entire Bucket Public (Not Recommended)

### Using AWS Console:
1. Go to S3 Console → `tatvaops-vision-production-moodboards`
2. Click **Permissions** tab
3. Under **Block public access**, click **Edit**
4. Uncheck all boxes (or at least "Block all public access")
5. Save changes
6. Under **Bucket policy**, add:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tatvaops-vision-production-moodboards/*"
    }
  ]
}
```

## Option 2: Configure CORS (Recommended - Keep Private)

This allows the frontend to download directly from S3 while keeping the bucket private:

1. Go to S3 Console → `tatvaops-vision-production-moodboards`
2. Click **Permissions** tab
3. Scroll to **Cross-origin resource sharing (CORS)**
4. Add this configuration:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://vision.tatvaops.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

## Option 3: Use CloudFront (Best Practice)

1. Create a CloudFront distribution
2. Point it to the S3 bucket
3. Configure CORS on CloudFront
4. Update frontend to use CloudFront URLs

## Quick AWS CLI Commands

### Make bucket public:
```bash
aws s3api put-bucket-public-access-block \
  --bucket tatvaops-vision-production-moodboards \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-policy \
  --bucket tatvaops-vision-production-moodboards \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tatvaops-vision-production-moodboards/*"
    }]
  }'
```

### Configure CORS (better option):
```bash
aws s3api put-bucket-cors \
  --bucket tatvaops-vision-production-moodboards \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["https://vision.tatvaops.com"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

