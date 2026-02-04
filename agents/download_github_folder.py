#!/usr/bin/env python3
"""
Download a GitHub subfolder without cloning the entire repository.
Uses only standard library - no external dependencies.

To avoid rate limits, set GITHUB_TOKEN environment variable:
    export GITHUB_TOKEN=your_token_here
"""

import urllib.request
import urllib.error
import json
import os
import sys
import re
import base64


def parse_github_url(url):
    """Parse GitHub URL to extract owner, repo, and path."""
    # Handle formats:
    # https://github.com/owner/repo/tree/branch/path
    # https://github.com/owner/repo/blob/branch/path
    pattern = r'github\.com/([^/]+)/([^/]+)/(?:tree|blob)/([^/]+)/(.*)'
    match = re.search(pattern, url)
    
    if match:
        owner, repo, branch, path = match.groups()
        return owner, repo, branch, path
    
    raise ValueError(f"Unable to parse GitHub URL. Expected format: https://github.com/owner/repo/tree/branch/path")


def get_github_token():
    """Get GitHub token from environment variable."""
    return os.environ.get('GITHUB_TOKEN', '')


def make_api_request(url):
    """Make authenticated GitHub API request."""
    req = urllib.request.Request(url)
    req.add_header('User-Agent', 'GitHub-Folder-Downloader')
    req.add_header('Accept', 'application/vnd.github.v3+json')
    
    token = get_github_token()
    if token:
        req.add_header('Authorization', f'token {token}')
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        if e.code == 403 and 'rate limit' in error_body.lower():
            print(f"Error: GitHub API rate limit exceeded.")
            print(f"Unauthenticated: 60 requests/hour")
            print(f"Authenticated: 5,000 requests/hour")
            print(f"\nTo increase limit, set GITHUB_TOKEN:")
            print(f"    export GITHUB_TOKEN=your_github_token")
            print(f"\nCreate token at: https://github.com/settings/tokens")
        elif e.code == 404:
            print(f"Error: Not found. Check the URL, branch name, and path.")
        else:
            print(f"Error: HTTP {e.code} - {e.reason}")
            print(f"Response: {error_body[:200]}")
        sys.exit(1)


def fetch_tree_recursive(owner, repo, branch, target_path):
    """
    Fetch all files in the target directory using Git Trees API.
    This makes only 1-2 API calls total, regardless of directory size!
    """
    # First, get the tree SHA for the branch
    branch_url = f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}"
    print(f"Fetching branch info...")
    branch_data = make_api_request(branch_url)
    tree_sha = branch_data['commit']['commit']['tree']['sha']
    
    # Now fetch the entire tree recursively with ONE API call
    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1"
    print(f"Fetching complete directory tree (recursive)...")
    tree_data = make_api_request(tree_url)
    
    # Filter to only include files in our target path
    target_prefix = target_path + "/"
    files = []
    
    for item in tree_data.get('tree', []):
        if item['type'] == 'blob' and item['path'].startswith(target_prefix):
            # This is a file within our target directory
            # Keep the full path to preserve folder structure as it is in the repo
            files.append({
                'path': item['path'],
                'sha': item['sha'],
                'size': item.get('size', 0)
            })
    
    return files


def download_file(owner, repo, branch, file_path, local_path):
    """Download a single file using raw.githubusercontent.com (CDN, high rate limits)."""
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"
    
    req = urllib.request.Request(raw_url)
    req.add_header('User-Agent', 'GitHub-Folder-Downloader')
    
    try:
        with urllib.request.urlopen(req) as response:
            with open(local_path, 'wb') as f:
                f.write(response.read())
        print(f"  ✓ {file_path}")
        return True
    except Exception as e:
        print(f"  ✗ Error downloading {file_path}: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python download_github_folder.py <github-folder-url> [output-directory]")
        print("")
        print("Examples:")
        print("  python download_github_folder.py https://github.com/owner/repo/tree/main/src/utils")
        print("  python download_github_folder.py https://github.com/owner/repo/tree/main/src/utils ./downloads")
        print("")
        print("Authentication (optional, increases rate limit from 60 to 5,000 req/hour):")
        print("  export GITHUB_TOKEN=your_github_token")
        print("  Create token at: https://github.com/settings/tokens")
        print("")
        print("This script uses the Git Trees API to fetch entire directory structure")
        print("in just 2 API calls, regardless of how many files/subdirectories exist!")
        sys.exit(1)
    
    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    
    try:
        owner, repo, branch, path = parse_github_url(url)
        
        # Get the target folder name (last part of path)
        folder_name = path.split('/')[-1] if '/' in path else path
        
        # Create the local folder path
        local_folder = os.path.join(output_dir, folder_name)
        os.makedirs(local_folder, exist_ok=True)
        
        print(f"Repository: {owner}/{repo}")
        print(f"Branch: {branch}")
        print(f"Path: {path}")
        print(f"Local folder: {local_folder}")
        print("")
        
        # Fetch all files in ONE API call (plus 1 for branch info = 2 total)
        files = fetch_tree_recursive(owner, repo, branch, path)
        
        if not files:
            print(f"No files found in {path}")
            sys.exit(0)
        
        print(f"Found {len(files)} files to download\n")
        
        # Download all files preserving internal folder structure
        success_count = 0
        for file_info in files:
            # Calculate relative path within the target folder
            relative_path = file_info['path'][len(path)+1:]  # Remove "path/" prefix
            local_file_path = os.path.join(local_folder, relative_path)
            if download_file(owner, repo, branch, file_info['path'], local_file_path):
                success_count += 1
        
        print(f"\n✓ Done! Downloaded {success_count}/{len(files)} files to: {local_folder}")
        
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nDownload cancelled.")
        sys.exit(1)


if __name__ == "__main__":
    main()
