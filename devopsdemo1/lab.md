### Introduction 

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide1.png?raw=true)

This lab/demo automates essential DevOps steps to support both inner loop for developers and outer loop for DevOps/SRE. It provides an example that platform engineering teams can use to boost developer productivity and streamline the inner to outer loop process. We will cover essential aspects, some best practices and an automated end-to-end approach for deploying containerized applications to GCP. Platform engineering teams can then provide this in a self-service tool to developers and ops. With pre-configured environments, developers can focus on coding and innovation, accelerating the delivery of high-quality software.

This is just a lab/demo, and views expressed here are my own. A broader coverage of best practices can be found in the  <a href="https://cloud.google.com/architecture/" target="_blank">Cloud Architecture Center</a>.

In this lab we will cover:

- The application foundations needed to host an application on the top (and in extention) of (to) a landing zone. The application foundations being created for a GCP project using Terraform for GCP services and ConfigSync for Kube related configurations
- The Cloud Build and Cloud Deploy configuration used for the outer-loop of application

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide2.png?raw=true)

The application has:

- the front end written in reactJS and deployed to CloudRun
- the back end "app", assembling the "quotes" and "writers" components are written in Go and deployed to GKE
- the "writers" component is accessing a Cloud SQL instance is using workload identity and the Go connector
- kustomize, using configmaps, will changes setting of the applications between environnements

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide3.png?raw=true)

InnerLoop, for Dev, is done on Workstation (or in the cloud shell editor) and OuterLoop will start when pushing the code to github.

- Skaffold is used to deploy the frontend to cloudrun, the default profile being dev
- Skaffold is used to deploy to backend to gke, the default profile being dev
- CloudBuild "cloudbuild-github.yaml" is being triggered when pushing the code to github on the main branch  

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide4.png?raw=true)

Flagger combined with Kubernetes GatewayAPI is used for Canary on prod, based on GMP metrics. 

### Terraform the project

On your github repo:

- Install the Cloud Build GitHub App on your GitHub account or in an organization you own.
- Create a PAT
- Make sure to set your token to have no expiration date and select the following permissions when prompted in GitHub: repo and read:user. If your app is installed in an organization, make sure to also select the read:org permission.
- Create a GCP secret to store github PAT in **my-github-secret** 

Create a new project and:

- Fork this repo in github then clone it locally in you dev env  
- In your local dev env change configSync/syncRepo in devopsdemo ./devopsdemo1/gke-conf/apply-spec.yaml 
- In your local dev env change the 3 occurences of projectid in ./devopsdemo1/quote-front/skaffold.yaml
- In your local dev env change project ids in related serviceaccounts.yaml example : cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com
- In your local dev env change INSTANCE_CONNECTION_NAME in your writers deployement.yaml of your base and overlays to have it connect to the Cloud SQL instance of your project
- Push this to your github repo
- In your local dev env change github_config_app_installation_id = 12345678 (you get this from https://github.com/settings/installations/) and google_cloudbuildv2_repository_remote_uri in ./devopsdemo1/variables.tf
- In your local dev env change project_id and project_number in ./devopsdemo1/variables.tf 
- Then launch and wait (about 15 min)

When using this content in your own GCP env you can eventually create a Google Workstation using ../workstationdemo2/Dockerfile and look at the complete insctructions in https://github.com/gbechara/gcpdemos/tree/main/devopsdemo1. This will give a better experience of the inner loop. The cloud shell editor is just to have a shorter lab.

```
terraform init
terraform plan
terraform apply
```

Next steps will cover both the dev inner loop (skaffold) or trigger cloudbuild thru the git push to the main branch (for this demo). Cloudbuild will then build the images and create a new deploy release

### Set Env 

This is done either in workstation or in the cloud shell editor, for this lab we will be using cloud shell editor.

```
# skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID
# skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID SKAFFOLD_DEFAULT_REPO
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=<your_google_cloud_region>
export GOOGLE_CLOUD_ZONE=<your_google_cloud_zone>
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
gcloud config set project $GOOGLE_CLOUD_PROJECT_ID
gcloud auth application-default login
gcloud container clusters get-credentials example-cluster --zone us-central1-a --project $GOOGLE_CLOUD_PROJECT_ID
```
### Deploy the App
Application related Inner Loop and OuterLoop

Frontend innerloop: you can do local tests for react page, you may need to install the npm packages 

```
# RUN curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash - && sudo apt-get install -y nodejs
cd ./devopsdemo1/quotes-front/views
# npm install
npm run start
```

Frontend innerloop: you can deploy frontend on cloudrun using the skaffold file, deployed to dev profile

```
cd ./devopsdemo1/quotes-front/
skaffold run
```

Backend innerloop: you can use skaddold to deploy composite backend on on GKE, deployed to dev profile
For database connection thru WorloadIndentity you will need to give to the gcloud user the Service Account Token Creator role.

```
cd ./devopsdemo1/quotes-back/
skaffold run
kubectl get pod -n dev
```

Start outerloop, this is done using the github trigger (on the main branch for this demo). cloudbuild-github.yaml will be triggered

```
cd ./devopsdemo1
git add .
git commit -m "a commit message"
git push
```

Use Cloudbuild for new releases (this also can be done using the trigger in the region), before doing that you need either to comment the binauthz attestations steps in cloudbuild-github.yaml or create the **<a href="https://github.com/gbechara/gcpdemos/tree/main/devopsdemo1#using-binautz-for-the-production-ns-on-example_cluster" target="_blank">binauthz attestors</a> and it's keyring** .
Added to this you need to give to the gcloud user the Service Account Token Creator role. 

```
gcloud builds submit --region=us-central1 --config devopsdemo1/cloudbuild-github.yaml ./ \
--impersonate-service-account=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com
```

### Challenge
The back end will not be accessible and you need to:

- create a new certificate using a domain that you own. This is an example using a project name and gabrielbechara.demo 

```
gcloud compute ssl-certificates create gab-dev-devops-1-certificate --domains app.dev.$GOOGLE_CLOUD_PROJECT_ID.gabrielbechara.demo.altostrat.com --global
gcloud compute ssl-certificates create gab-prod-devops-1-certificate --domains app.prod.$GOOGLE_CLOUD_PROJECT_ID.gabrielbechara.demo.altostrat.com --global
```

- Create record set, for both dev and prod of type A in DNS with the external IP of your loadbalancer created by the gateway api (or have your instructor create an DNS entry using your IP and hostname for Dev and Prod)
- Change the certificate of the gke gateway in bootstrap.yaml in gke-conf/my-fleet-conf/bootstrap.yaml then push the code upstream to have configsync update the cluster
- Change the routing rule in quotes-back/app/overlays/dev/gateway.yaml and in quotes-back/app/overlays/prod/gateway.yaml 
- Redeploy the backend on dev using skaffold
- Test the access to you back end on https://app.dev.gab-devops-1.gabrielbechara.demo.altostrat.com/api/citations

The front end is accessing another backend, to adjust this you need to:

- Change the files .env, .env.dev, .env.prod in quotes-front/view
- Change the REACT_APP_BACK_URL in quotes-front/skaffold.yaml   
- Redeploy the frontend on dev using skaffold
- Test the frontend on the cloudrun url of the GCP console 

### Additional steps 
To test releases without pushing the code upstream 
quotes-front (CloudRun)

```
gcloud deploy releases create release-xxx \
 --project=$GOOGLE_CLOUD_PROJECT_ID --region=$GOOGLE_CLOUD_REGION \
 --skaffold-version=skaffold_preview \
 --delivery-pipeline=devopsdemo1-run \
 --images=quotes-front=$(skaffold build -q | jq -r ".builds[].tag")
```

quotes-back (GKE)

```
gcloud deploy releases create release-xxx \
 --project=$GOOGLE_CLOUD_PROJECT_ID --region=$GOOGLE_CLOUD_REGION \
 --delivery-pipeline=devopsdemo1-gke --to-target=dev \
 --images=quotes-back=$(skaffold build -q | jq -r ".builds[].tag")
```

Use Cloudbuild for new releases

```
gcloud builds submit --region=us-central1 --config devopsdemo1/cloudbuild-github.yaml ./

curl --header 'Host: app.dev.gabrielbechara.com' http://10.132.0.48
curl --header 'Host: app.prod.gabrielbechara.com' http://10.132.0.48

After the release is deploy to dev, promote it to production

gcloud deploy releases promote  --release=release-xxx --delivery-pipeline=canary --region=$GOOGLE_CLOUD_REGION --to-target=prod
```

Flagger canary testing

```
kubectl -n prod describe canary/app
gcloud compute url-maps export gkegw1-ll1w-prod-app-4bpekl57o1qy --region=$GOOGLE_CLOUD_REGION
```

### Using Binautz for the production ns on example_cluster
Give access for cloudbuild to attestor for binary auth 
Binautz assets are assumed to be created before this step
You can either:

 - Use the <a href="https://cloud.google.com/binary-authorization/docs/creating-attestors-console" target="_blank">console</a> 
 - Use this <a href="https://cloud.google.com/architecture/binary-auth-with-cloud-build-and-gke" target="_blank">tutorial</a> in relation with cloudbuid
 - Use this <a href="https://cloud.google.com/binary-authorization/docs/multi-project-setup-cli" target="_blank">multi-project</a> practice, this might be a best practice you will want to enforce
 - Use this <a href="https://cloud.google.com/binary-authorization/docs/cloud-build" target="_blank">tutorial</a>  

The easiest way for this demo is to use the console:

- create a keyring named **binauthz-attestors** and a key named **binauthz-signing-key** of type multi-region, location **global**, protection level software, purpose **asymmetric-signing**, keys algorith **ec-sign-p256-sha256** . 
- create a binauthz attestors named **built-by-cloud-build** with a PKIX Key imported form KMS. The ressource ID of the Key previously created using KMS is projects/${PROJECT_ID}/locations/global/keyRings/binauthz-attestors/cryptoKeys/binauthz-signing-key/cryptoKeyVersions/1
 
Then you need to create the adequate permissions for the SA used by cloudbuild :

```
# Permission cloudkms.cryptoKeyVersions.viewPublicKey
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
    --role="roles/binaryauthorization.attestorsViewer"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
    --role="roles/cloudkms.signerVerifier"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
    --role="roles/containeranalysis.notes.attacher"

```

Then after you can create a policy that "Allow all images" to be deployed Kubernetes cluster and namespace-specific rules on the dev and prod namespaces defaulted to "Allow all images". During the demo The one for the prod namespace will be switched to requires the attestations you created in the previous step.

-----

Fetch IP for DNS setup (used to test the application back end rest services)

```
kubectl get gateways.gateway.networking.k8s.io app-dev  -n dev -o=jsonpath="{.status.addresses[0].value}"
```

Trigger Pipelines : inner loop in workstation

Create new release for deployment

```
skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID -p prod
skaffold build --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID 
```