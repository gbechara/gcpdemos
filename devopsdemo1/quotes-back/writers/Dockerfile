# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#FROM node:14-alpine as nodebuilder
#WORKDIR /code
#COPY views/ ./views/ 
#WORKDIR /code/views
#RUN npm run build

FROM golang:1.19 as golangbuilder
WORKDIR /code
COPY *.go ./
COPY go.mod .
# `skaffold debug` sets SKAFFOLD_GO_GCFLAGS to disable compiler optimizations
ARG SKAFFOLD_GO_GCFLAGS
RUN go mod tidy
RUN go build -gcflags="${SKAFFOLD_GO_GCFLAGS}" -trimpath -o /app .

#Alpine will not take in direc
#FROM alpine:3.10
FROM golang:1.19
# Define GOTRACEBACK to mark this container as using the Go language runtime
# for `skaffold debug` (https://skaffold.dev/docs/workflows/debug/).
ENV GOTRACEBACK=single
CMD ["./app"]
COPY --from=golangbuilder /app .
#COPY --from=builder /code/views/ ./views
#COPY --from=builder /code/views/build ./views/public
# copy optimised build of React.JS resulting from npm run build (npm start build could be used locally for tests)
#COPY --from=nodebuilder /code/views/build ./views/public 
