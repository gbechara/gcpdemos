#
#
provider "google" {
  project = var.project_id
  region = var.region
}

resource "google_project_service" "project_googleapis_compute" {
  project = var.project_id
  service = "compute.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "project_googleapis_container" {
  project = var.project_id
  service = "container.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "project_googleapis_clouddeploy" {
  project = var.project_id
  service = "clouddeploy.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "project_googleapis_artifactregistry" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "project_googleapis_aiplatform" {
  project = var.project_id
  service = "aiplatform.googleapis.com"
  disable_dependent_services = true
}

resource "google_compute_network" "default" {
  name = "default"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_compute_subnetwork" "proxy" {
  name          = "proxy"
  ip_cidr_range = "10.103.0.0/23"
  region        = var.region
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
  network       = google_compute_network.default.name
}

resource "google_artifact_registry_repository" "devopsdemo1repo" {
  location      = var.region
  repository_id = "devopsdemo1repo"
  description   = "Docker repository"
  format        = "DOCKER"
  depends_on = [google_project_service.project_googleapis_container]
}

resource "google_artifact_registry_repository" "devopsdemo1npm" {
  location      = var.region
  repository_id = "devopsdemo1npm"
  description   = "Node repository"
  format        = "NPM"
  depends_on = [google_project_service.project_googleapis_container]
}

resource "google_project_iam_member" "clouddeploy_jobrunner" {
  project = var.project_id
  role    = "roles/clouddeploy.jobRunner"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_releaser" {
  project = var.project_id
  role    = "roles/clouddeploy.releaser"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_container_cluster" "example_cluster" {
  name = "example-cluster"
  location  = var.zone
  min_master_version = "latest"
  network = google_compute_network.default.name
  initial_node_count       = 1
  remove_default_node_pool = true
  networking_mode =  "VPC_NATIVE"
  enable_shielded_nodes = true
  default_max_pods_per_node = 30
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
  monitoring_config { 
    managed_prometheus {
      enabled = true
    }
  }
  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  } 
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  depends_on = [google_project_service.project_googleapis_container]
}

resource "google_container_node_pool" "primary_preemptible_nodes" {
  name       = "my-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.example_cluster.name
  node_count = 1

  node_config {
    machine_type = "e2-medium"
  }
}

resource "google_service_account" "flagger" {
  account_id = "flagger"
  display_name = "Flagger Service Account"
}

resource "google_service_account_iam_binding" "flagger" {
  role    = "roles/iam.workloadIdentityUser"
  members  = ["serviceAccount:${var.project_id}.svc.id.goog[flagger-system/flagger]"]
  service_account_id = google_service_account.flagger.name
  depends_on = [google_container_cluster.example_cluster]
}

resource "google_compute_managed_ssl_certificate" "gab-dev-certificate" {
  name        = "gab-dev-certificate"
  managed {
    domains = ["app.dev.gabrielbechara.com"]
  }
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_compute_managed_ssl_certificate" "gab-prod-certificate" {
  name        = "gab-prod-certificate"
  managed {
    domains = ["app.prod.gabrielbechara.com"]
  }
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_jobrunner_prod" {
  project = var.project_id
  role    = "roles/clouddeploy.jobRunner"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_developer_prod" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_admin_prod" {
  project = var.project_id
  role    = "roles/clouddeploy.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_serviceAgent_prod" {
  project = var.project_id
  role    = "roles/run.serviceAgent"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_artifactregistry_reader_prod" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_artifactregistry_writer_prod" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "clouddeploy_monitoring_metricWriter_prod" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_sql_database_instance" "devopsdemo-instance" {
  name             = "devopsdemo-instance"
  region           = "us-central1"
  database_version = "POSTGRES_14"
  settings {
    tier = "db-f1-micro"
  }
}

resource "google_sql_database" "quotes-app-db" {
  name     = "quotes-app-db"
  instance = google_sql_database_instance.devopsdemo-instance.name
}

resource "google_service_account" "cloudsql_sa" {
  account_id = "cloudsql-sa"
  display_name = "Cloud SQL Service Account"
}

resource "google_sql_user" "iam_service_account_user" {
  name     = trimsuffix(google_service_account.cloudsql_sa.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.devopsdemo-instance.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
  depends_on = [google_sql_database.quotes-app-db]
}

resource "google_project_iam_member" "cloudsql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_sql_database.quotes-app-db, google_sql_database_instance.devopsdemo-instance]
}

resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "cloudsql_instanceUser" {
  project = var.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "cloudsql_logWriter" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_service_account" "llm_sa" {
  account_id = "llm-sa"
  display_name = "LLM Service Account"
}


resource "google_project_iam_member" "llm_sa" {
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.llm_sa.email}"
  project = var.project_id
}


resource "google_compute_managed_ssl_certificate" "llm_dev_certificate" {
  name        = "llm-dev-certificate"
  managed {
    domains = ["llm.dev.gabrielbechara.com"]
  }
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_compute_managed_ssl_certificate" "llm_prod_certificate" {
  name        = "llm-prod-certificate"
  managed {
    domains = ["llm.prod.gabrielbechara.com"]
  }
  depends_on = [google_project_service.project_googleapis_compute]
}

resource "google_project_iam_member" "alloydb_admin" {
  project = var.project_id
  role    = "roles/alloydb.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
  depends_on = [google_project_service.project_googleapis_compute]
}
