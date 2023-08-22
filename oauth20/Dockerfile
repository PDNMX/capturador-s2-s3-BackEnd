FROM node:16
ADD . /oauth20v2
WORKDIR /oauth20v2

RUN yarn add global yarn \
&& yarn install \
&& yarn cache clean

EXPOSE 9004

CMD ["yarn", "start"]

