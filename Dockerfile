FROM node:18

# installing netcat for wait-for-postgres.sh
RUN apt-get update && apt-get install -y netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm install --include=optional

COPY . .

# build Tailwind CSS (creates assets/styles/tailwind-generated.css)
RUN npm run build:css

# wait for postgres
COPY wait-for-postgres.sh /wait-for-postgres.sh
RUN sed -i 's/\r$//' /wait-for-postgres.sh && chmod +x /wait-for-postgres.sh

# entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 1337

# run entrypoint
CMD ["/entrypoint.sh"]
