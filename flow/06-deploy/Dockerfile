FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
RUN printf 'server {\n listen 8080;\n root /usr/share/nginx/html;\n index index.html;\n location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf \
 && sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
