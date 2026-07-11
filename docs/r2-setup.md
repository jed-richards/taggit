# Image storage setup — Cloudflare R2 (one-time)

Item photos are uploaded **directly from the browser to R2** using presigned
PUT URLs minted by the API (`GET /api/collections/:id/items/upload-url`), then
the final public URL is stored on the item as `image_url`. The API server
never proxies image bytes.

## 1. Create the bucket

1. [Cloudflare dashboard](https://dash.cloudflare.com/) → **R2 Object Storage**
   → Create bucket, name it e.g. `taggit-images` (location: automatic).
2. Note your **Account ID** (shown on the R2 overview page).

## 2. Public access for reads

Pick one (custom domain is nicer long-term):

- **Custom domain**: bucket → Settings → Public access → Custom Domains →
  connect e.g. `images.taggit.example`. `R2_PUBLIC_BASE_URL=https://images.taggit.example`
- **r2.dev**: bucket → Settings → Public access → allow. You get
  `https://pub-<hash>.r2.dev`; use that as `R2_PUBLIC_BASE_URL`.

Uploads stay private either way — writes only happen via presigned URLs.

## 3. API token for presigning

R2 → **Manage R2 API Tokens** → Create API token:

- Permissions: **Object Read & Write**
- Scope: only the `taggit-images` bucket
- Copy the **Access Key ID** and **Secret Access Key**

## 4. Bucket CORS (required for browser PUTs)

Bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://taggit.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `taggit.example.com` with the real production origin when it exists
(deploy issue), and keep localhost for dev.

## 5. Environment variables

In `backend/.env` (see `backend/.env.example`):

```
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<token access key id>
R2_SECRET_ACCESS_KEY=<token secret>
R2_BUCKET=taggit-images
R2_PUBLIC_BASE_URL=https://images.taggit.example
```

## 6. Verify

With the backend running and a signed-in session:

1. `GET /api/collections/<id>/items/upload-url?content_type=image/jpeg` →
   `{ upload_url, image_url, expires_in }`
2. `curl -X PUT -H 'content-type: image/jpeg' --data-binary @photo.jpg "<upload_url>"` → `200`
3. Open `<image_url>` in a browser → the photo.

Notes: object keys are server-generated
(`collections/{id}/items/{uuid}.{ext}`), presigned URLs expire after 10
minutes, and only `image/jpeg`, `image/png`, `image/webp`, `image/heic` are
accepted. Objects uploaded but never attached to an item are harmless garbage;
a cleanup janitor is a post-v1 nice-to-have.
