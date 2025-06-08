# Zebrafish Registry Security Information

## Security Features

This application implements several security features:

1. **JWT Token Security**:
   - Access tokens (short-lived)
   - Refresh tokens (long-lived, HttpOnly cookie)
   - Token expiration and refresh flow

2. **CSRF Protection**:
   - Single-use CSRF tokens for all non-GET requests
   - Token pairing strategy (token_id + token value)

3. **API Security**:
   - Rate limiting on sensitive endpoints
   - Input validation with Marshmallow schemas
   - Comprehensive error handling

4. **Audit Logging**:
   - All critical operations are logged with user information
   - Logs stored in `logs/audit.log`

5. **Security Headers**:
   - Content Security Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - X-XSS-Protection
   - Strict-Transport-Security

## Security Recommendations

For production environments, consider:

1. Always use HTTPS
2. Set secure and SameSite flags on cookies
3. Implement IP-based rate limiting
4. Use a web application firewall (WAF)
5. Regular security audits and penetration testing