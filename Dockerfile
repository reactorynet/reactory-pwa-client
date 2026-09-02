FROM docker.io/library/nginx:alpine

ARG REACTORY_CONFIG_ID=booktutor
ARG REACTORY_ENV_ID=podman

# Setup default nginx SPA routing with security and cache headers
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \\.(?:css|js|woff2?|svg|gif|map|png|html|ico|jpg|jpeg)$ {\n\
        expires 1d;\n\
        add_header Cache-Control "public, no-transform";\n\
        try_files $uri =404;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy build artifacts into nginx html root
COPY build/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
