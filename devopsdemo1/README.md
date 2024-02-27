## CI/CD Demo on GCP 
### Introduction 

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide1.png?raw=true)
<br/><br/>
The objective of this lab is to show, in terms of approach and best practices, some aspects to consider when deploying a containerized application to GCP.

This is just a lab/demo, and views expressed here are my own. A broader coverage of best practices can be found in the  <a href="https://cloud.google.com/architecture/" target="_blank">Cloud Architecture Center</a>.

In this demo we will cover:
- The application foundations needed to host an application on the top (and in extention) of (to) a landing zone. The application foundations being created for a GCP project using Terraform for GCP services and ConfigSync for Kube related configurations
- The Cloud Build and Cloud Deploy configuration used for the outer-loop of application

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide2.png?raw=true)

The application has 
- the front end written in reactJS and deployed to CloudRun
- the back end "app", assembling the "quotes" and "writers" components are written in Go and deployed to GKE
- the "writers" component is accessing a Cloud SQL instance is using workload identity and the Go connector
- kustomize, using configmaps, will changes setting of the applications between environnements
<br/><br/>

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide3.png?raw=true)

InnerLoop, for Dev, is done on Workstation and OuterLoop will start when pushing the code to github.
- Skaffold is used to deploy the frontend to cloudrun, the default profile being dev
- Skaffold is used to deploy to backend to gke, the default profile being dev
- CloudBuild "cloudbuild-github.yaml" is being triggered when pushing the code to github on the main branch (this being a demo) 
<br/><br/>
![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide4.png?raw=true)

Flagger combined with Kubernetes GatewayAPI is used for Canary on prod, based on GMP metrics. 

To replace variables in files you can use sed example :

```
sed -i "s/GOOGLE_CLOUD_PROJECT_ID/$GOOGLE_CLOUD_PROJECT_ID/g" clouddeploy.yaml
sed -i "s/GOOGLE_CLOUD_REGION/$GOOGLE_CLOUD_REGION/g" clouddeploy.yaml
```
Note: on mac use sed -i "" "s/XXX/$XXX/g" filename.yaml
## Installing the demo 
### Step 1 - Terraform set up of the project
Prepare your Google Workstation using ../workstationdemo2/Dockerfile. <br/> 

On your github repo 
- Install the Cloud Build GitHub App on your GitHub account or in an organization you own.
- Create a PAT
- Make sure to set your token to have no expiration date and select the following permissions when prompted in GitHub: repo and read:user. If your app is installed in an organization, make sure to also select the read:org permission.
- Create a GCP secret to store github PAT in **my-github-secret** 

Create a new project and:
- Fork this repo in github then clone it locally in you dev env,  
- In your local dev env change configSync/syncRepo in devopsdemo ./devopsdemo1/gke-conf/apply-spec.yaml 
- In your local dev env change the 3 occurences of projectid in ./devopsdemo1/quote-front/skaffold.yaml
then push this to your github repo
- In your local dev env change github_config_app_installation_id = 12345678 (you get this from https://github.com/settings/installations/) and google_cloudbuildv2_repository_remote_uri in ./devopsdemo1/variables.tf
- In your local dev env change project_id and project_number in ./devopsdemo1/variables.tf 
- In your local dev env change project ids in related serviceaccounts.yaml example : cloudsql-sa@$PROJECT_ID.iam.gserviceaccount.com
- Then launch and wait (about 15 min)


```
terraform init
terraform plan
terraform apply
```
You can now Jump to **<a href="https://github.com/gbechara/gcpdemos/tree/main/devopsdemo1#step-app---deploy-the-app" target="_blank">Step APP</a> - Deploy the App** .

The intermadiary steps **Step 2** to **Step 17** are already executed using 
- Terraform for GCP ressouces 
- ConfigSync for KRM ressouces.

**Step App** is either done during the dev inner loop (skaffold) or trigger cloudbuild thru the git push to the main branch (for this demo). Cloudbuild will then build the images and create a new deploy release
### Step 2 
Set Env

```
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=<your_google_cloud_region>
export GOOGLE_CLOUD_ZONE=<your_google_cloud_zone>
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
```
### Step 3 
Enable APIs  

```
gcloud services enable compute.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable container.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable clouddeploy.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable binaryauthorization.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable aiplatform.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable anthosconfigmanagement.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable run.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable certificatemanager.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
```

GKE E  

```
gcloud services enable anthos.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable gkehub.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable gkeconnect.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable cloudresourcemanager.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud services enable iam.googleapis.com --project $GOOGLE_CLOUD_PROJECT_ID
gcloud alpha container fleet create --display-name=my-gke-fleet-1 --project=$GOOGLE_CLOUD_PROJECT_ID
```

### Step 4 - Optional
Create Proxy-only subnet, needed for regionnal LB using gatewayClassName: gke-l7-rilb 

Note : The Proxy-only subnet is not used with gatewayClassName: gke-l7-global-external-managed  

```
#gcloud compute networks subnets create proxy \
#    --purpose=REGIONAL_MANAGED_PROXY \
#    --role=ACTIVE \
#    --region=$GOOGLE_CLOUD_REGION \
#    --network=default \
#    --range=10.103.0.0/23
```

### Step 5
Create an artefact repo and configure docker and skaffold to relate to it

```
gcloud artifacts repositories create devopsdemo1repo --repository-format=docker \
--location=$GOOGLE_CLOUD_REGION --project $GOOGLE_CLOUD_PROJECT_ID --description="Docker repository"
gcloud artifacts repositories create devopsdemo1npm --repository-format=npm \
--location=$GOOGLE_CLOUD_REGION --project $GOOGLE_CLOUD_PROJECT_ID --description="Node repository"
gcloud auth configure-docker $GOOGLE_CLOUD_REGION-docker.pkg.dev
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
```

Configure IAM

```
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
--member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com \
--role="roles/clouddeploy.jobRunner"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
--member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com \
--role="roles/clouddeploy.releaser"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
--member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com \
--role="roles/container.developer"
```

### Step 6
Create a GKE Cluster with HPA and Workload Identity preinstalled

```
gcloud beta container clusters create "example-cluster" --cluster-version "1.24.5-gke.600" --region "$GOOGLE_CLOUD_REGION"  --machine-type "e2-medium" --max-pods-per-node "30" --num-nodes "1" --enable-autoscaling --min-nodes "0" --max-nodes "3" --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver --enable-managed-prometheus --workload-pool "$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog" --enable-shielded-nodes --gateway-api=standard --enable-ip-alias
```

Or create a zonal GKE Cluster with HPA and Workload Identity preinstalled

```
gcloud container clusters create "example-cluster" --cluster-version "latest" --zone "$GOOGLE_CLOUD_ZONE"  --machine-type "e2-medium" --max-pods-per-node "30" --num-nodes "1" --enable-autoscaling --min-nodes "0" --max-nodes "3" --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver --enable-managed-prometheus --workload-pool "$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog" --enable-shielded-nodes --gateway-api=standard --enable-ip-alias
```

Keep those instruction to use on workstation to connect to the cluster. 
Connect to regional cluster

```
gcloud container clusters get-credentials example-cluster --region $GOOGLE_CLOUD_REGION
```

Connect to zonal cluster

```
gcloud container clusters get-credentials example-cluster --region $GOOGLE_CLOUD_ZONE
```

### Step 7 - Enables fleets and add the GKE cluster to the fleet
GKE E Fleets, add cluster to fleet and configure congig-synch

```
#sudo apt-get install google-cloud-sdk-nomos
gcloud container clusters update example-cluster --enable-fleet --region $GOOGLE_CLOUD_ZONE
gcloud beta container fleet config-management enable --project=$GOOGLE_CLOUD_PROJECT_ID
#gcloud beta container fleet config-management status --project=$GOOGLE_CLOUD_PROJECT_ID

gcloud beta container fleet policycontroller enable --project=$GOOGLE_CLOUD_PROJECT_ID --memberships=example-cluster

gcloud beta container fleet config-management apply --membership=example-cluster --config=gke-conf/apply-spec.yaml --project=$GOOGLE_CLOUD_PROJECT_ID
```

### Step 8
Create namespaces 

```
kubectl create namespace dev
kubectl create namespace prod
```

### Step 9 
Bootstrap Flagger and the Gateway
Install Flagger for Gateway API

```
kubectl apply -k github.com/fluxcd/flagger//kustomize/gatewayapi
```

Flagger KSA needs to be annotated, Flagger GSA with monitoring access

```
gcloud iam service-accounts create flagger --project=$GOOGLE_CLOUD_PROJECT_ID

gcloud iam service-accounts add-iam-policy-binding flagger@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[flagger-system/flagger]"

kubectl annotate serviceaccount flagger \
    --namespace flagger-system \
    iam.gke.io/gcp-service-account=flagger@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com
```

Create certificate for Gateways

```
gcloud compute ssl-certificates create gab-dev-certificate --domains app.dev.gabrielbechara.com --global
gcloud compute ssl-certificates create gab-prod-certificate --domains app.prod.gabrielbechara.com --global
```
Create Gateways and Flaggers Setting for canary deployment on GKE prod namespace

```
kubectl apply -f bootstrap.yaml
```

### Step 10 - Managed Prometheus
Deploy GMP Query Interface

```
kubectl create serviceaccount gmp -n prod
gcloud iam service-accounts create gmp-sa --project=$GOOGLE_CLOUD_PROJECT_ID

gcloud iam service-accounts add-iam-policy-binding gmp-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[prod/gmp]"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member=serviceAccount:gmp-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/monitoring.viewer

kubectl annotate serviceaccount gmp \
    --namespace prod \
    iam.gke.io/gcp-service-account=gmp-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com

sed -i "s/GOOGLE_CLOUD_PROJECT_ID/$GOOGLE_CLOUD_PROJECT_ID/g" gmp-frontend.yaml
sed -i "s/GOOGLE_CLOUD_PROJECT_ID/$GOOGLE_CLOUD_PROJECT_ID/g" devopsdemo1/gke-conf/my-fleet-conf/serviceaccounts.yaml

kubectl apply -n prod -f gmp-frontend.yaml
```

### Step 11 : Additional policy binding 
Create Cloud Deploy Pipelines & Set permissions for Cloud Deploy and apply pipeline

```
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/clouddeploy.jobRunner"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/container.developer"    
#gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
#    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
#    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
#    --role="roles/run.developer"
#gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
#    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
#    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
#    --role="roles/run.admin"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/run.developer"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/run.admin"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/run.serviceAgent"        
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/artifactregistry.reader"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/artifactregistry.writer"    
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/monitoring.metricWriter"
```

### Step 12 : Cloud SQL SA and policy bindings
Service accounts roles for cloud sql database (split later dev and prod)

```
gcloud iam service-accounts create cloudsql-sa \
  --display-name="Cloud SQL SA"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.instanceUser"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud iam service-accounts add-iam-policy-binding \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[dev/ksa-cloud-sql-dev]" \
  cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com    

gcloud iam service-accounts add-iam-policy-binding \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[prod/ksa-cloud-sql-prod]" \
  cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com
```

### Step 13 - Annotate Kubernete SA to related them Cloud SQL SA
This step need to be done after deploying the application in Step App
Service accounts roles for cloud sql database (split later dev and prod)

```
kubectl annotate serviceaccount \
  ksa-cloud-sql-dev  \
  --namespace dev \
  iam.gke.io/gcp-service-account=cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com  

kubectl annotate serviceaccount \
  ksa-cloud-sql-prod  \
  --namespace prod \
  iam.gke.io/gcp-service-account=cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com

```

### Step 14 - Optional - For the LLM tab going through IAP 
Service accounts roles for LLM (split later dev and prod) and IAP SA

```
gcloud iam service-accounts create llm-sa \
  --display-name="LLM SA"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:llm-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud beta services identity create --service=iap.googleapis.com --project=gab-devops-1  

```

Create certificate for HPPT LB used by IAP

```
gcloud compute ssl-certificates create llm-dev-certificate --domains llm.dev.gabrielbechara.com --global
gcloud compute ssl-certificates create llm-prod-certificate --domains llm.prod.gabrielbechara.com --global
```

Service accounts roles for alloydb test (split later dev and prod)

```
#gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
#  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
#  --role="roles/alloydb.admin"
```

### Step 15 - Cloud SQL
Create a cloud sql database (split later dev and prod)

```
gcloud sql instances create devopsdemo-instance \
  --database-version=POSTGRES_14 \
  --cpu=1 \
  --memory=4GB \
  --region=us-central1 \
  --database-flags=cloudsql.iam_authentication=on

gcloud sql databases create quotes-app-db \
  --instance=devopsdemo-instance

gcloud sql users create cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam \
  --instance=devopsdemo-instance \
  --type=cloud_iam_service_account


#kubectl create secret generic cloudsql-secret \
#  --from-literal=username=cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
#  --from-literal=password=<YOUR-DATABASE-PASSWORD> \
#  --from-literal=database=devopsdemo-instance

# kubectl create secret generic cloudsql-privateip \
#    --from-literal=db_host=<YOUR-PRIVATE-IP-ADDRESS>

https://cloud.google.com/sql/docs/mysql/connect-kubernetes-engine
https://codelabs.developers.google.com/codelabs/cloud-sql-go-connector#4  

```

### Step 16 - Cloud Deploy Pipelines
Deploy Pipelines for GKE (application back end) and CloudRun (other components)

```
#gcloud deploy apply --file clouddeploy.yaml --region=$GOOGLE_CLOUD_REGION --project=$GOOGLE_CLOUD_PROJECT_ID 
gcloud deploy apply --file clouddeploy-run.yaml --region=$GOOGLE_CLOUD_REGION --project=$GOOGLE_CLOUD_PROJECT_ID 
gcloud deploy apply --file clouddeploy-gke.yaml --region=$GOOGLE_CLOUD_REGION --project=$GOOGLE_CLOUD_PROJECT_ID 
```

### Step 17 - GitHub Trigger
Create a cloud build trigger for both front-end on run and back-end microservices assembly on gke
Note : The github cloudcloudbuild (cloudbuild-github.yaml) is needed for this foder structure (all building blocks under the same directory)

```
gcloud beta builds triggers create github --name="devopsdemo1-tigger1"\
    --region=us-central1 \
    --repo-name=gcpdemos \
    --repo-owner=gbechara \
    --branch-pattern=^main$ \
    --build-config=devopsdemo1/cloudbuild-github.yaml \
    --include-logs-with-status
```

### Step APP - Deploy the App
Application related Inner Loop and OuterLoop

Set Env on workstation  

```
# skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID
# skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID SKAFFOLD_DEFAULT_REPO
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=<your_google_cloud_region>
export GOOGLE_CLOUD_ZONE=<your_google_cloud_zone>
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
gcloud config set project $GOOGLE_CLOUD_PROJECT_ID
gcloud container clusters get-credentials example-cluster --zone us-central1-a --project $GOOGLE_CLOUD_PROJECT_ID
```

Frontend innerloop: you can do local tests for react page

```
cd ./devopsdemo1/quotes-front/views
npm run start
```

Frontend innerloop: you can deploy frontend on cloudrun using the skaffold file, deployed to dev profile

```
cd ./devopsdemo1/quotes-front/
skaffold run
```

Backend innerloop: you can use skaddold to deploy composite backend on on GKE, deployed to dev profile

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
You can either  
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