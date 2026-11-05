FROM nginx:1.27-alpine

COPY index.html style.css app.js data.js favicon.svg /usr/share/nginx/html/
