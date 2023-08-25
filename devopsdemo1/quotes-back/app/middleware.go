package main

import (
	"context"
	"log"
	"net/http"
	"time"
	//"errors"
	"net/url"


	jwtmiddleware "github.com/auth0/go-jwt-middleware/v2"
	"github.com/auth0/go-jwt-middleware/v2/validator"
	"github.com/auth0/go-jwt-middleware/v2/jwks"
	"github.com/gin-gonic/gin"
)

// CustomClaimsExample contains custom data we want from the token.
type CustomClaimsExample struct {
	//iss           	string `json:"iss"`
	azp           	string `json:"azp,omitempty"`
	//aud           	string `json:"aud"`
	//sub           	string `json:"sub"`
	hd           	string  `json:"hd,omitempty"`
	email       	string `json:"email,omitempty"`
	email_verified 	bool `json:"email_verified,omitempty`
	//nbf				int64 `json:"nbf,omitempty"`
	name         	string `json:"name,omitempty"`
	picture         string `json:"picture,omitempty"`
	given_name    	string `json:"given_name,omitempty"`
	family_name   	string `json:"family_name,omitempty"`
	locale     		string `json:"locale,omitempty"`
	//iat         	int64  `json:"iat"`
	//exp         	int64  `json:"exp"`
	//jti         	string `json:"jti"`

	//ShouldReject bool   `json:"shouldReject,omitempty"`
}

// Validate errors out if `ShouldReject` is true.
func (c *CustomClaimsExample) Validate(ctx context.Context) error {
	//if c.ShouldReject {
	//	return errors.New("should reject was set to true")
	//}
	return nil
}

var (
	// The signing key for the token.
	signingKey = []byte("secret")

	// The issuer of our token.
	issuer = "https://accounts.google.com"

	// The audience of our token.
	audience = []string{"248688270572-camos4ukonlfrlgnp84ksbbta667gqcu.apps.googleusercontent.com"}

	// Our token must be signed using this data.
	keyFunc = func(ctx context.Context) (interface{}, error) {
		return signingKey, nil
	}

	// We want this struct to be filled in with
	// our custom claims from the token.
	customClaims = func() validator.CustomClaims {
		return &CustomClaimsExample{}
	}
)

// checkJWT is a gin.HandlerFunc middleware
// that will check the validity of our JWT.


func checkJWT() gin.HandlerFunc {
	// Set up the validator.


	log.Printf("gin.HandlerFunc JWS signed keyFunc : %v", keyFunc)

	issuerURL, err := url.Parse(issuer)
	provider := jwks.NewCachingProvider(issuerURL, 5*time.Minute)

	log.Printf("gin.HandlerFunc JWKS provider.KeyFunc : %v", provider.KeyFunc)


	jwtValidator, err := validator.New(
		provider.KeyFunc,
		validator.RS256,
		issuer,
		audience,
		validator.WithCustomClaims(customClaims),
		validator.WithAllowedClockSkew(300*time.Second),
	)
	if err != nil {
		log.Fatalf("failed to set up the validator: %v", err)
	}

	
	errorHandler := func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("Encountered error while validating JWT: %v", err)
	}

	middleware := jwtmiddleware.New(
		jwtValidator.ValidateToken,
		jwtmiddleware.WithErrorHandler(errorHandler),
	)

	return func(ctx *gin.Context) {
		//log.Printf("http.keyFunc: %v", keyFunc)
		log.Printf("http.HandlerFunc: %v", ctx.Request)
		encounteredError := true
		var handler http.HandlerFunc = func(w http.ResponseWriter, r *http.Request) {
			encounteredError = false
			//log.Printf("in http.HandlerFunc func: %v", r.GetBody)
			ctx.Request = r
			ctx.Next()
		}

		middleware.CheckJWT(handler).ServeHTTP(ctx.Writer, ctx.Request)

		if encounteredError {
			ctx.AbortWithStatusJSON(
				http.StatusUnauthorized,
				map[string]string{"message": "JWT is invalid."},
			)
		}
	}
}