# Base image is a build arg so each environment can use its own approved
# registry. Override with `--build-arg NGINX_BASE_IMAGE=<image>`, or set
# NGINX_BASE_IMAGE in config/env/<config>/.env.build.<env> for bin/podman-build.sh.
# Default: nginx's unprivileged image from ECR Public. nginx 1.30.7 carries the
# CVE fix; the image runs as the non-root nginx user (uid 101) and listens on 8080.
ARG NGINX_BASE_IMAGE=public.ecr.aws/nginx/nginx-unprivileged:1.30.7-alpine

FROM ${NGINX_BASE_IMAGE}

ARG REACTORY_CONFIG_ID=booktutor
ARG REACTORY_ENV_ID=podman

# SPA routing and cache headers; fail the build on an invalid config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
RUN nginx -t

# Copy build artifacts into nginx html root
COPY build/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/ /usr/share/nginx/html/

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
