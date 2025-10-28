#!/bin/bash

# SSL Certificate Setup Script for Custom Domains
# This script uses Let's Encrypt (certbot) to obtain SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}OnPoints.it SSL Certificate Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${RED}Error: certbot is not installed${NC}"
    echo "Please install certbot first:"
    echo "  Ubuntu/Debian: sudo apt-get install certbot python3-certbot-nginx"
    echo "  CentOS/RHEL: sudo yum install certbot python3-certbot-nginx"
    exit 1
fi

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Get domain from argument or prompt
DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Enter the domain name:${NC}"
    read -p "> " DOMAIN
fi

# Validate domain format
if ! [[ $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    echo -e "${RED}Error: Invalid domain format${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Setting up SSL certificate for: ${DOMAIN}${NC}"
echo ""

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo -e "${YELLOW}Certificate already exists for ${DOMAIN}${NC}"
    read -p "Do you want to renew it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot renew --cert-name $DOMAIN
    fi
else
    # Obtain new certificate
    echo -e "${GREEN}Obtaining SSL certificate...${NC}"
    certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL certificate obtained successfully${NC}"
    else
        echo -e "${RED}✗ Failed to obtain SSL certificate${NC}"
        exit 1
    fi
fi

# Create symlinks for Docker Nginx
SSL_DIR="/etc/nginx/ssl"
mkdir -p $SSL_DIR

ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/${DOMAIN}_cert.pem"
ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/${DOMAIN}_key.pem"

echo -e "${GREEN}✓ SSL certificates linked to $SSL_DIR${NC}"

# Setup auto-renewal
if ! crontab -l | grep -q "certbot renew"; then
    echo -e "${YELLOW}Setting up auto-renewal...${NC}"
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'docker exec nginx nginx -s reload'") | crontab -
    echo -e "${GREEN}✓ Auto-renewal configured (runs daily at 3 AM)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Certificate files:"
echo -e "  - Cert: ${GREEN}$SSL_DIR/${DOMAIN}_cert.pem${NC}"
echo -e "  - Key:  ${GREEN}$SSL_DIR/${DOMAIN}_key.pem${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your Nginx config to use these certificates"
echo "2. Reload Nginx: docker exec nginx nginx -s reload"
echo "3. Update DNS A record to point to your server IP"
echo ""
echo -e "${GREEN}Certificate will auto-renew before expiration${NC}"

