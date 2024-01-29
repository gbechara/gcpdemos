#
#
provider "google" {
  project = var.project_id
  region = var.region
}

resource "google_compute_network" "default" {
  name = "default"
}

resource "google_compute_subnetwork" "proxy" {
  name          = "proxy"
  ip_cidr_range = "10.103.0.0/23"
  region        = var.region
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
  network       = "default"
}

resource "google_artifact_registry_repository" "devopsdemo1repo" {
  location      = var.region
  repository_id = "devopsdemo1repo"
  description   = "Docker repository"
  format        = "DOCKER"
}

resource "google_artifact_registry_repository" "devopsdemo1npm" {
  location      = var.region
  repository_id = "devopsdemo1npm"
  description   = "Node repository"
  format        = "NPM"
}

resource "google_project_iam_member" "clouddeploy_jobrunner" {
  project = var.project_id
  role    = "roles/clouddeploy.jobRunner"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_releaser" {
  project = var.project_id
  role    = "roles/clouddeploy.releaser"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_container_cluster" "example_cluster" {
  name             = "example-cluster"
  location          = var.region
  initial_node_count       = 1
  remove_default_node_pool = true
  addons_config {
   horizontal_pod_autoscaling {
      disabled = false
    }
   http_load_balancing {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }

  }

    gateway_api_config {
      channel = CHANNEL_STANDARD
    } 

  enable_shielded_nodes = true

  enable_ip_alias   = true
}

resource "google_container_node_pool" "primary_preemptible_nodes" {
  name       = "my-node-pool"
  location   = "us-central1"
  cluster    = google_container_cluster.example_cluster.name
  node_count = 1

  node_config {
    machine_type = "e2-medium"
  }
}

resource "google_kubernetes_engine_cluster_gateway" "app_dev" {
  name          = "app-dev"
  namespace     = "dev"
  location      = var.region
  gateway_class = "gke-l7-gxlb"
}

resource "google_service_account" "flagger" {
  account_id = "flagger"
  display_name = "Flagger Service Account"
}

resource "google_service_account_iam_binding" "flagger" {
  role    = "roles/iam.workloadIdentityUser"
  member  = "serviceAccount:${var.project_id}.svc.id.goog[flagger-system/flagger]"
  service_account = google_service_account.flagger.email
}

resource "google_compute_ssl_certificate" "gab-dev-certificate" {
  name        = "gab-dev-certificate"
  private_key = file("certs/gab-dev-certificate.key")
  certificate = file("certs/gab-dev-certificate.crt")
  managed     = false
}

resource "google_compute_ssl_certificate" "gab-prod-certificate" {
  name        = "gab-prod-certificate"
  private_key = file("certs/gab-prod-certificate.key")
  certificate = file("certs/gab-prod-certificate.crt")
  managed     = false
}

resource "google_kubernetes_engine_service" "app" {
  name        = "app"
  namespace   = "dev"
  port        = 80
  target_port = 8080
  selector    = "app=app"
}

resource "google_kubernetes_engine_deployment" "app" {
  name        = "app"
  namespace   = "dev"
  replicas    = 1
  selector    = "matchLabels:app=app"
  template {
    metadata {
      labels = {
        app = "app"
      }
    }
    spec {
      containers {
        name  = "app"
        image = "us-docker.pkg.dev/${var.project_id}/devopsdemo1repo/app:latest"
        ports {
          container_port = 8080
        }
      }
    }
  }
}

resource "google_kubernetes_engine_ingress" "app" {
  name        = "app"
  namespace   = "dev"
  rule {
    http {
      paths {
        path    = "/"
        path_type = "Exact"
        backend {
          service_name = google_kubernetes_engine_service.app.id
          service_port = google_kubernetes_engine_service.app.port
        }
      }
    }
  }
}

resource "google_kubernetes_engine_service" "app_prod" {
  name        = "app"
  namespace   = "prod"
  port        = 80
  target_port = 8080
  selector    = "app=app"
}

resource "google_kubernetes_engine_deployment" "app_prod" {
  name        = "app"
  namespace   = "prod"
  replicas    = 1
  selector    = "matchLabels:app=app"
  template {
    metadata {
      labels = {
        app = "app"
      }
    }
    spec {
      containers {
        name  = "app"
        image = "us-docker.pkg.dev/${var.project_id}/devopsdemo1repo/app:latest"
        ports {
          container_port = 8080
        }
      }
    }
  }
}

resource "google_kubernetes_engine_ingress" "app_prod" {
  name        = "app"
  namespace   = "prod"
  rule {
    http {
      paths {
        path    = "/"
        path_type = "Exact"
        backend {
          service_name = google_kubernetes_engine_service.app_prod.id
          service_port = google_kubernetes_engine_service.app_prod.port
        }
      }
    }
  }
}

resource "google_project_iam_member" "clouddeploy_jobrunner_prod" {
  project = var.project_id
  role    = "roles/clouddeploy.jobRunner"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_developer_prod" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_admin_prod" {
  project = var.project_id
  role    = "roles/clouddeploy.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_serviceAgent_prod" {
  project = var.project_id
  role    = "roles/run.serviceAgent"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_artifactregistry_reader_prod" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_artifactregistry_writer_prod" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "clouddeploy_monitoring_metricWriter_prod" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_sql_database_instance" "devopsdemo-instance" {
  name             = "devopsdemo-instance"
  region           = "us-central1"
  database_version = "POSTGRES_14"
  cpu              = 1
  memory           = "4GB"
}

resource "google_sql_database" "quotes-app-db" {
  name     = "quotes-app-db"
  instance = google_sql_database_instance.devopsdemo-instance.name
}

resource "google_sql_user" "cloudsql-sa" {
  name     = "cloudsql-sa"
  instance = google_sql_database_instance.devopsdemo-instance.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

resource "google_project_iam_member" "cloudsql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudsql_instanceUser" {
  project = var.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudsql_logWriter" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_service_account" "llm_sa" {
  account_id = "llm-sa"
  display_name = "LLM Service Account"
}

resource "google_service_account_iam_binding" "llm_sa" {
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  service_account = google_service_account.llm_sa.email
}

resource "google_compute_ssl_certificate" "llm_dev_certificate" {
  name        = "llm-dev-certificate"
  private_key = file("certs/llm-dev-certificate.key")
  certificate = file("certs/llm-dev-certificate.crt")
  managed     = false
}

resource "google_compute_ssl_certificate" "llm_prod_certificate" {
  name        = "llm-prod-certificate"
  private_key = file("certs/llm-prod-certificate.key")
  certificate = file("certs/llm-prod-certificate.crt")
  managed     = false
}

resource "google_project_iam_member" "alloydb_admin" {
  project = var.project_id
  role    = "roles/alloydb.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}
