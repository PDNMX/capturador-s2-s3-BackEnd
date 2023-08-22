FROM node:18-alpine

ADD . /backend
WORKDIR /backend

RUN npm install
&& npm cache clean --force  

EXPOSE 3004

CMD ["npm", "run", "start"]
