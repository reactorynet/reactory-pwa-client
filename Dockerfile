# Pinned: nginx 1.30.7 (stable) carries the CVE fix; don't float on :alpine.
FROM docker.io/library/nginx:1.31.9-alpine

ARG REACTORY_CONFIG_ID=booktutor
ARG REACTORY_ENV_ID=podman

# SPA routing and cache headers; fail the build on an invalid config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
RUN nginx -t

# Copy build artifacts into nginx html root
COPY build/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
