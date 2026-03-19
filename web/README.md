export PROJECT_ID=cron5-dev
export GAR_LOCATION=asia-southeast1
export GAR_REPOSITORY=orbitx
export IMAGE_NAME=orbitx-web

# 
IMAGE_URI=${GAR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${GAR_REPOSITORY}/${IMAGE_NAME}:latest

docker build -t ${IMAGE_URI} --platform=linux/amd64 -f docker/Dockerfile . 

docker push ${IMAGE_URI}

docker run -it -p 5173:5173 asia-southeast1-docker.pkg.dev/orbitx-dev/orbitx/orbitx-web:latest