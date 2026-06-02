FROM golang:1.26.3-alpine AS builder

WORKDIR /app

# Copy only deps first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o api ./cmd/api/

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/api .

EXPOSE 8000
CMD ["./api"]
