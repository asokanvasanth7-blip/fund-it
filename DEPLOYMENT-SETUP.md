# Automatic FTP Deployment Setup

This guide explains how to configure automatic deployment of your Fund-It Angular application to an FTP server whenever code is pushed to the main branch.

## What's Been Set Up

A GitHub Actions workflow has been created at `.github/workflows/deploy.yml` that will:
1. ✅ Automatically trigger on every push to the `main` branch
2. ✅ Install Node.js and project dependencies
3. ✅ Build the Angular application for production
4. ✅ Deploy the built files to your FTP server

## Configuration Steps

### Step 1: Configure GitHub Secrets

You need to add your FTP credentials as GitHub repository secrets. These keep your sensitive information secure.

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following three secrets:

   | Secret Name | Description | Example |
   |------------|-------------|---------|
   | `FTP_SERVER` | Your FTP server address | `ftp.yourhost.com` |
   | `FTP_USERNAME` | Your FTP username | `your-username` |
   | `FTP_PASSWORD` | Your FTP password | `your-secure-password` |

### Step 2: Verify Build Output Directory

The workflow is configured to deploy files from `./dist/fund-it/browser/`. If your Angular build outputs to a different directory, update the `local-dir` setting in `.github/workflows/deploy.yml`.

To check your build output:
```bash
npm run build -- --configuration production
```
Then check the `dist` folder structure.

### Step 3: Configure Server Directory

The workflow currently deploys to the root directory of your FTP server (`server-dir: ./`). If you need to deploy to a subdirectory (e.g., `public_html`, `www`, or `htdocs`), update this in the workflow file:

```yaml
server-dir: ./public_html/  # Change this to your target directory
```

### Step 4: Push to Main Branch

Once secrets are configured, simply push your code to the main branch:

```bash
git add .
git commit -m "Set up automatic FTP deployment"
git push origin main
```

The deployment will start automatically! 🚀

## Monitoring Deployments

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. You'll see all deployment runs listed
4. Click on any run to see detailed logs

## Workflow Features

- **Automatic triggers**: Deploys on every push to main
- **Node.js caching**: Faster builds with cached dependencies
- **Production build**: Optimized Angular build for production
- **Secure credentials**: FTP credentials stored as encrypted secrets
- **Incremental uploads**: Only changed files are uploaded (faster deployments)

## Customization Options

### Deploy to Multiple Environments

If you want to deploy to staging and production, you can modify the workflow to deploy different branches to different servers.

### Add Build Notifications

You can integrate Slack, Discord, or email notifications by adding additional steps to the workflow.

### Run Tests Before Deploy

Add a test step before deployment:

```yaml
- name: Run tests
  run: npm test -- --watch=false --browsers=ChromeHeadless
```

### Custom Build Configuration

Modify the build command if you have custom configurations:

```yaml
- name: Build Angular app
  run: npm run build -- --configuration production --base-href /your-path/
```

## Troubleshooting

### Build Fails
- Check the Actions tab for error logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### FTP Connection Issues
- Verify FTP credentials are correct
- Check if your FTP server allows connections from GitHub's IP ranges
- Some hosts require SFTP instead of FTP (see alternative action below)

### Wrong Deployment Directory
- Check your Angular build output in `angular.json`
- Verify the `outputPath` setting matches the workflow's `local-dir`

## Alternative: SFTP Deployment

If your server uses SFTP instead of FTP, replace the deploy step with:

```yaml
- name: Deploy to SFTP
  uses: wlixcc/SFTP-Deploy-Action@v1.2.4
  with:
    server: ${{ secrets.FTP_SERVER }}
    username: ${{ secrets.FTP_USERNAME }}
    password: ${{ secrets.FTP_PASSWORD }}
    local_path: './dist/fund-it/browser/*'
    remote_path: '/public_html'
    sftp_only: true
```

## Security Best Practices

✅ **DO**:
- Use GitHub Secrets for all credentials
- Use strong FTP passwords
- Limit FTP user permissions to necessary directories only
- Enable two-factor authentication on GitHub

❌ **DON'T**:
- Never commit FTP credentials to your repository
- Don't use the same password for multiple services
- Avoid using root FTP accounts

## Support

If you encounter issues:
1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review the [FTP-Deploy-Action repository](https://github.com/SamKirkland/FTP-Deploy-Action)
3. Check your FTP server logs

---

**Last Updated**: October 2025

