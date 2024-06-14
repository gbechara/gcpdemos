## Introduction 

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide1.png?raw=true)

This lab/demo automates essential DevOps steps to support both inner loop for developers and outer loop for DevOps/SRE. It provides an example that platform engineering teams can use to boost developer productivity and streamline the inner to outer loop process. We will cover essential aspects, some best practices and an automated end-to-end approach for deploying containerized applications to GCP. Platform engineering teams can then provide this in a self-service tool to developers and ops. With pre-configured environments, developers can focus on coding and innovation, accelerating the delivery of high-quality software.

This is just a lab/demo, and views expressed here are my own. A broader coverage of best practices can be found in the  <a href="https://cloud.google.com/architecture/" target="_blank">Cloud Architecture Center</a>.

In this lab we will cover:

- The application foundations needed to host an application on top (and in extention) of (to) a landing zone. The application foundations being created for a GCP project using Terraform for GCP services and ConfigSync for Kube related configurations
- The Cloud Build and Cloud Deploy configuration used for the outer-loop of application

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide2.png?raw=true)

The application has:

- The front end written in ReactJS and deployed to CloudRun. GCS could have been as a target. CloudRun have been chosen for it's versatility when moving to Server Side rendering frameworks such as NextJS 
- The back end "app", assembling the "quotes" and "writers" components are written in Go and deployed to GKE
- The "writers" component is accessing a Cloud SQL instance is using workload identity and the Go connector
- kustomize, using configmaps, will changes setting of the applications between environnements

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide3.png?raw=true)

Inner Loop, for Dev, is done on Workstation (or in the cloud shell editor) and OuterLoop will start when pushing the code to github.

- Skaffold is used to deploy the frontend to cloudrun, the default profile being dev
- Skaffold is used to deploy to backend to gke, the default profile being dev
- CloudBuild "cloudbuild-github.yaml" is being triggered when pushing the code to github on the main branch  

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide4.png?raw=true)

Flagger combined with Kubernetes GatewayAPI is used for Canary on prod, based on GMP metrics. 

## Terraform the project

On your github repo (This step needs to be performed using a github account, you may need to use your account or create one):

- Install the [Cloud Build GitHub App](https://github.com/apps/google-cloud-build) on your GitHub account or in an organization you own.
- Create a PAT (Classic) [here](https://github.com/settings/tokens)
- Make sure to select the following permissions when prompted in GitHub: `repo` (Full control of private repositories) and `read:user` (Read ALL user profile data). If your app is installed in an organization, make sure to also select the `read:org` permission.
- Create a GCP secret using secret manager to store your Github PAT in **my-github-secret** 

In Cloud Shell :

* Fork this repo [https://github.com/gbechara/gcpdemos/](https://github.com/gbechara/gcpdemos/) in Github 
* Clone it locally in your dev environement
* Replace the `syncRepo` variable in the file `./devopsdemo1/gke-conf/apply-spec.yaml` with the URL of your forked repo.
* Replace all occurrences of the project ID and project number placeholder with your actual project ID in the following files:
    * `./devopsdemo1/gke-conf/my-fleet-conf/serviceaccounts.yaml`
    * `./devopsdemo1/quotes-front/skaffold.yaml` (Only for the 3 `projectid:`)
    * `./devopsdemo1/quotes-back/writers/base/deployment.yaml`
    * `./devopsdemo1/quotes-back/writers/overlays/dev/deployment.yaml`
    * `./devopsdemo1/quotes-back/writers/overlays/prod/deployment.yaml`

* Update the following variables in the `./devopsdemo1/variables.tf` file:

    * `github_config_app_installation_id`: Replace this with the ID of your GitHub application installation. You can find this value on [this page](https://github.com/settings/installations) when you click on the GCB app and look at the URL.
    * `google_cloudbuildv2_repository_remote_uri`: Replace this with the URL of your forked repo in GitHub.
    * `google_configmanagement_sync_repo`: Replace this with the URL of your forked repo in GitHub.
    * `project_id`: Replace this with your actual GCP project ID.
    * `project_number`: Replace this with your actual GCP project number. You can find this value in the project settings in the GCP console.

- Then you can launch the following commands and wait about 15mins

```
gcloud auth application-default login
terraform init
terraform plan
terraform apply
```

You can optionnally prepare your **[Cloud Workstation](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/lab.md#optional-step--set-up-workstations)** instead of using Cloud Shell.

The next steps will cover the two options for building and deploying the application. The first option is to use Skaffold for the development inner loop, which allows for rapid iterative development. The second option is to trigger a Cloud Build through a git push to the main branch. Cloud Build will then build the images and create a new Cloud Deploy release.

## Set Env 

This is done either in workstation or in the Cloud Shell editor, for this lab we will be using Cloud Shell editor.

```
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=us-central1
export GOOGLE_CLOUD_ZONE=us-central1-a
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
export GOOGLE_APPLICATION_CREDENTIALS=$HOME/.config/gcloud/application_default_credentials.json
gcloud config set project $GOOGLE_CLOUD_PROJECT_ID
```

Then ensure you are logged in and retrieve the credentials to access the cluster with `kubectl` later.

```
gcloud auth login
gcloud container clusters get-credentials example-cluster --zone $GOOGLE_CLOUD_ZONE --project $GOOGLE_CLOUD_PROJECT_ID
```

## Deploy the App

### Frontend Inner loop

You can experiment locally with your React pages, but you may need to install the npm packages. Note that the npm experience in Cloud Shell is not dev ready. So unless you are using a Cloud Workstation, you should skip this step and deploy the frontend on Cloud Run using the skaffold file.

```
# In the workstation if you followed the instruction you should have node installed
# You may want to install it yourself temporarly until you add it the the docker image serving as template for your workstation 
# RUN curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash - && sudo apt-get install -y nodejs
# or on cloud shell nvm install stable 
cd ./devopsdemo1/quotes-front/views
# npm install 
##### you may need to delete package-lock.json and node_modules and reinstall
npm run start:dev
```

You can deploy the frontend on Cloud Run using the `skaffold.yaml` file. It will deploy a new revision of the dev service.

```
cd ./devopsdemo1/quotes-front/
skaffold run
```

### Backend Inner loop
You can use skaffold to deploy the composite backend to the dev namespace on GKE 

```
cd ./devopsdemo1/quotes-back/
skaffold run
kubectl get pod -n dev
```

Notes : It is possible that some pods fail to start on the cluster because of IAM permissions on the SQL database. Don't worry, IAM authentication has been set up by terraform, but the changes may take some time to be propagate.

### Outer loop
The outer loop is started on every `git push` to the main branch. The trigger is defined in `cloudbuild-github.yaml`, and has been created in Cloud Build via Terraform in the previous steps. For simplicity in this demo, we will only use the default branch. You can then use the console to see the status of the trigger in the correct region.

```
cd ./devopsdemo1
git add .
git commit -m "a commit message"
git push
```

If you want to start the outer loop manually without pushing to the repository, you can submit a build manually using the following command. You can comment the binauthz attestations steps in cloudbuild-github.yaml, but it should work by keeping it as is, since those are steps are optional. You can also create the **<a href="https://github.com/gbechara/gcpdemos/tree/main/devopsdemo1#using-binautz-for-the-production-ns-on-example_cluster" target="_blank">binauthz attestors</a> and its keyring**.
Added to this you might need to give to the gcloud user the Service Account Token Creator role.

```
gcloud builds submit --region=us-central1 --config devopsdemo1/cloudbuild-github.yaml ./ \
--impersonate-service-account=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com
```

## Challenge

The back end will not be accessible and you need to:

- Create SSL certificates for dev and prod subdomains of a domain you own. This is an example using gabrielbechara.demo.altostrat.com:

```
gcloud compute ssl-certificates create gab-dev-devops-1-certificate --domains app.dev.$GOOGLE_CLOUD_PROJECT_ID.gabrielbechara.demo.altostrat.com --global
gcloud compute ssl-certificates create gab-prod-devops-1-certificate --domains app.prod.$GOOGLE_CLOUD_PROJECT_ID.gabrielbechara.demo.altostrat.com --global
```

- For each environment (dev and prod), create an A record in your DNS zone pointing to the external IP of your loadbalancer created by the gateway api (or have your instructor create an DNS entry using your IP and hostname for dev and prod)
- Change the certificate of the gke gateway in `bootstrap.yaml` and in `gke-conf/my-fleet-conf/bootstrap.yaml` then push the code upstream to have configsync update the cluster
- Change the routing rule in `quotes-back/app/overlays/dev/gateway.yaml` and in `quotes-back/app/overlays/prod/gateway.yaml`
- Redeploy the backend on dev using skaffold
- Test the access to your backend on https://app.dev.YOUR_DOMAIN/api/citations

Now, we need to tell the frontend to access the correct backend URL:

- Change the files `.env`, `.env.dev` and `.env.prod` in `quotes-front/view`
- Change the `REACT_APP_BACK_URL` in `quotes-front/skaffold.yaml`
- Redeploy the frontend on dev using skaffold
- Test the frontend on the cloudrun URL shown on the GCP console

## One more thing

The better feature kept until last ... well we have a backend that could use a servicemesh. The app is composing the quotes and writers. We may think that this is done for the purposes of this demo? Well yes, and this has become mandatory since microservices has become the default architecture. This will add :

- Robust tracing, monitoring 
- Logging features insights into how your services are performing 
- Authentication, authorization and encryption between services 

What if we can do this in fully managed way ?

Well if you look into the terraform you used in the beginning of this lab you will see the activation of the mesh api and the addition of the cluster example-cluster as to the membership. This means that a **managed servicemesh** is activated for you cluster and you can activate the mesh for your namespace using :  

```
kubectl label namespace dev istio-injection=enabled --overwrite
```

and then go to the servicemesh feature of your gkee cluster console, and the mesh will show up after doing some traffic in your application.

Added to this we have been using the gateway api as an ingress to the applications, and you can combine service mesh with the gateway api as described here : https://cloud.google.com/service-mesh/docs/managed/service-mesh-cloud-gateway. If you look into the repository used by gke-conf/my-fleet-conf you will notice that there is file **l7-gateway-class.yaml** that describe a GatewayClass that should have also been deployed by now. Meaning that you can replace in gke-conf/my-fleet-conf/bootstrap.yaml the **gatewayClassName** by the one of servicemesh. You may also notice that flagger have been used in the prod namespace to do canary deployment and this is done on the app level, not per service. Doing canary per service, for example the writers service comes with a new version will imply configuring a destination rule and a virtual service as described here https://cloud.google.com/service-mesh/docs/by-example/canary-deployment.

## Additional steps

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

## Using Binautz for the production namespace on example_cluster

Give access for cloudbuild to attestor for binary auth 
Binautz assets are assumed to be created before this step
You can either:

 - Use the <a href="https://cloud.google.com/binary-authorization/docs/creating-attestors-console" target="_blank">console</a> 
 - Use this <a href="https://cloud.google.com/architecture/binary-auth-with-cloud-build-and-gke" target="_blank">tutorial</a> in relation with cloudbuid
 - Use this <a href="https://cloud.google.com/binary-authorization/docs/multi-project-setup-cli" target="_blank">multi-project</a> practice, this might be a best practice you will want to enforce
 - Use this <a href="https://cloud.google.com/binary-authorization/docs/cloud-build" target="_blank">tutorial</a>  

The easiest way for this demo is to use the console:

- create a keyring named **binauthz-attestors** and a key named **binauthz-signing-key** of type multi-region, location **global**, protection level software, purpose **asymmetric-signing**, keys algorithm **ec-sign-p256-sha256** . 
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

Now you have to configure the project policy to define custom rules for each namespace. By default, the policy is set to "Allow all images". It means that any image can be deployed to Kubernetes clusters. 

Add two namespace-specific rules for the dev and prod namespaces to require attestations. You can use dry run mode on the dev namespace to only get audit logs instead of blocking untrusted images.

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

## Optional step : Set up Workstations

A Workstations Cluster and Config has been set up by the terraform script. You may need to build a custom image containing node and other dev related options. To do this 

In .workstationdemo2/ set env

```
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=<your_google_cloud_region>
export GOOGLE_CLOUD_ZONE=<your_google_cloud_zone>
export ARTIFACT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
docker build -t cloud-custom-workstation-1 .
```

Build, tag then push the docker image 

```
docker build -t cloud-custom-workstation-1 .
docker tag cloud-custom-workstation-1:latest  $ARTIFACT_REPO/cloud-custom-workstation-1:latest
docker push $ARTIFACT_REPO/cloud-custom-workstation-1
```

In the GCP console edit the Workstations config and replace the image by the custom image you just built, then you can create a custom workstation based on the custom image.

## Conclusion and next steps

In this lab/demo, we demonstrated automating the setup of app foundations for GCP and GKE. We used Workstation and Skaffold for the development inner loop, and Cloud Build/Deploy for the outer loop. To manage deployments across environments (dev/prod), we employed kustomize to variabilize source code and deployment manifests. Workload identity was also utilized.  However, to keep the lab/demo simple, some real-world considerations were omitted.  Here are additional factors to address in a production setting:

- **Branching and Tagging Strategy:** Define a clear branching and tagging model (e.g., GitFlow, Trunk-Based) that aligns with your development workflow. Establish triggers in Cloud Build to execute the appropriate pipelines based on branching and tagging events.
- **Git Repository Structure:** Maintain separate Git repositories for infrastructure-as-code (IaC) and application code. Further organize application code repositories based on team ownership and microservice architecture, to promote modularity and independent versioning. 
- **Environment and Resource Isolation:** Use separate GCP projects for development, staging, and production environments. This enhances security and change control. Consider dedicating GKE clusters per environment or utilizing namespaces, depending on isolation needs and cost factors. Align project and cluster access with team responsibilities.