//! Evidence collection and redaction primitives used by CI Outage Witness.
//!
//! ```
//! use ci_outage_witness::Redactor;
//!
//! let mut redactor = Redactor::new(&[r"customer_[0-9]+".into()])?;
//! let safe = String::from_utf8(redactor.redact(b"TOKEN=hunter2 customer_42"))?;
//! assert!(!safe.contains("hunter2"));
//! assert!(!safe.contains("customer_42"));
//! # Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
//! ```
#![forbid(unsafe_code)]

use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::fs::{File, OpenOptions};
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use std::time::Duration;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SCHEMA_VERSION: &str = "1.0";
const MAX_RESPONSE_BYTES: u64 = 100 * 1024 * 1024;

pub type AnyError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Run {
    pub id: u64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub display_title: String,
    #[serde(default)]
    pub event: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub conclusion: Option<String>,
    #[serde(default)]
    pub workflow_id: u64,
    #[serde(default)]
    pub run_number: u64,
    #[serde(default = "one")]
    pub run_attempt: u32,
    #[serde(default)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub run_started_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub html_url: String,
    #[serde(default)]
    pub head_branch: String,
    #[serde(default)]
    pub head_sha: String,
    #[serde(default)]
    pub actor: Actor,
}

fn one() -> u32 {
    1
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Actor {
    #[serde(default)]
    pub login: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Job {
    pub id: u64,
    #[serde(default)]
    pub run_id: u64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub conclusion: Option<String>,
    #[serde(default)]
    pub started_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub runner_name: Option<String>,
    #[serde(default)]
    pub runner_group_name: Option<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub steps: Vec<Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct JobsResponse {
    #[serde(default)]
    pub total_count: usize,
    #[serde(default)]
    pub jobs: Vec<Job>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatusSummary {
    #[serde(default)]
    pub page: Value,
    #[serde(default)]
    pub status: Value,
    #[serde(default)]
    pub components: Vec<StatusComponent>,
    #[serde(default)]
    pub incidents: Vec<StatusIncident>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatusComponent {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatusIncident {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub impact: String,
    #[serde(default)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub components: Vec<StatusComponent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceState {
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observed_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uncertainty: Option<String>,
}

impl SourceState {
    pub fn collected(observed_at: DateTime<Utc>, detail: impl Into<Option<String>>) -> Self {
        Self {
            state: "collected".into(),
            detail: detail.into(),
            observed_at: Some(observed_at),
            uncertainty: None,
        }
    }

    pub fn unavailable(observed_at: DateTime<Utc>, error: impl ToString) -> Self {
        let mut detail = error.to_string();
        if detail.len() > 240 {
            detail.truncate(240);
            detail.push('…');
        }
        Self {
            state: "unavailable".into(),
            detail: Some(detail),
            observed_at: Some(observed_at),
            uncertainty: None,
        }
    }

    pub fn not_requested(detail: Option<String>) -> Self {
        Self {
            state: "not-requested".into(),
            detail,
            observed_at: None,
            uncertainty: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Classification {
    pub label: String,
    pub confidence: String,
    pub signals: Vec<String>,
    pub caveat: String,
}

#[derive(Debug, Clone)]
pub struct EvidenceFile {
    pub name: String,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct Evidence {
    pub run: Run,
    pub jobs: JobsResponse,
    pub status: Option<StatusSummary>,
    pub attempts: BTreeMap<u32, Value>,
    pub log_files: Vec<EvidenceFile>,
    pub runner_files: Vec<EvidenceFile>,
    pub sources: BTreeMap<String, SourceState>,
    pub classification: Classification,
    pub observed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResultSummary {
    pub bundle: PathBuf,
    pub repository: String,
    pub run_id: u64,
    pub observed_at: DateTime<Utc>,
    pub classification: Classification,
    pub partial: bool,
}

#[derive(Debug, Serialize)]
struct Manifest<'a> {
    schema_version: &'static str,
    tool_version: &'static str,
    repository: &'a str,
    run_id: u64,
    observed_at: DateTime<Utc>,
    classification: &'a Classification,
    sources: &'a BTreeMap<String, SourceState>,
    attempts: Vec<u32>,
    share_warning: &'static str,
}

struct NamedPattern {
    name: String,
    regex: Regex,
}

pub struct Redactor {
    patterns: Vec<NamedPattern>,
    counts: BTreeMap<String, usize>,
    ansi: Regex,
}

#[derive(Debug, Serialize)]
struct RedactionReport<'a> {
    total_replacements: usize,
    by_pattern: &'a BTreeMap<String, usize>,
    notice: &'static str,
}

impl Redactor {
    pub fn new(custom: &[String]) -> Result<Self, AnyError> {
        let defaults = [
            (
                "github-token",
                r"(?i)\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b",
            ),
            (
                "authorization",
                r"(?i)(authorization\s*[:=]\s*(?:bearer|token)?\s*)[^\s,;]+",
            ),
            (
                "sensitive-assignment",
                r#"(?i)([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|CLIENT_SECRET|ACCESS_KEY)[A-Z0-9_]*\s*[:=]\s*)(?:"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|[^\s,;]+)"#,
            ),
            (
                "url-credential",
                r"(?i)([?&](?:token|key|secret|signature|sig)=)[^&\s]+",
            ),
            (
                "pem-private-key",
                r"(?s)-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----.*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
            ),
        ];
        let mut patterns = Vec::new();
        let mut counts = BTreeMap::new();
        for (name, expression) in defaults {
            patterns.push(NamedPattern {
                name: name.into(),
                regex: Regex::new(expression)?,
            });
            counts.insert(name.into(), 0);
        }
        for (index, expression) in custom.iter().enumerate() {
            let name = format!("custom-{}", index + 1);
            let regex = Regex::new(expression)
                .map_err(|error| format!("invalid --redact expression {expression:?}: {error}"))?;
            patterns.push(NamedPattern {
                name: name.clone(),
                regex,
            });
            counts.insert(name, 0);
        }
        Ok(Self {
            patterns,
            counts,
            ansi: Regex::new(r"\x1b\[[0-?]*[ -/]*[@-~]")?,
        })
    }

    pub fn redact(&mut self, input: &[u8]) -> Vec<u8> {
        let lossy = String::from_utf8_lossy(input);
        let mut output = self.ansi.replace_all(&lossy, "").into_owned();
        for pattern in &self.patterns {
            let found = pattern.regex.find_iter(&output).count();
            if found == 0 {
                continue;
            }
            *self.counts.entry(pattern.name.clone()).or_default() += found;
            output = pattern
                .regex
                .replace_all(&output, "${1}[REDACTED]")
                .into_owned();
        }
        output.into_bytes()
    }

    fn report(&self) -> RedactionReport<'_> {
        RedactionReport {
            total_replacements: self.counts.values().sum(),
            by_pattern: &self.counts,
            notice: "Pattern-based redaction cannot guarantee discovery of arbitrary secrets. Review before sharing.",
        }
    }
}

pub fn classify(
    run: &Run,
    jobs: &JobsResponse,
    status: Option<&StatusSummary>,
    logs: &[EvidenceFile],
    observed_at: DateTime<Utc>,
) -> Classification {
    let mut result = Classification {
        label: "inconclusive".into(),
        confidence: "low".into(),
        signals: Vec::new(),
        caveat: "This is an evidence-guided classification, not a root-cause determination.".into(),
    };
    let mut status_affected = false;
    let recent_run = run
        .updated_at
        .or(run.run_started_at)
        .or(run.created_at)
        .is_some_and(|timestamp| (observed_at - timestamp).num_minutes().abs() <= 120);
    if let Some(status) = status {
        for component in &status.components {
            if component.name.to_lowercase().contains("actions")
                && component.status != "operational"
            {
                status_affected |= recent_run;
                result.signals.push(format!(
                    "GitHub Status reported {} as {} at observation time",
                    component.name, component.status
                ));
            }
        }
        for incident in &status.incidents {
            for component in &incident.components {
                if component.name.to_lowercase().contains("actions") {
                    let run_start = run.created_at;
                    let run_end = run.updated_at.or(run.run_started_at).or(run.created_at);
                    let incident_end = incident.updated_at.or(Some(observed_at));
                    let overlaps = match (run_start, run_end, incident.created_at, incident_end) {
                        (
                            Some(run_start),
                            Some(run_end),
                            Some(incident_start),
                            Some(incident_end),
                        ) => incident_start <= run_end && incident_end >= run_start,
                        _ => recent_run,
                    };
                    status_affected |= overlaps;
                    result.signals.push(format!(
                        "active public incident mentions {}: {}",
                        component.name, incident.name
                    ));
                }
            }
        }
    }
    let joined = logs
        .iter()
        .map(|file| String::from_utf8_lossy(&file.data).to_lowercase())
        .collect::<String>();
    let infrastructure_markers = [
        "runner not found",
        "lost communication with the server",
        "self-hosted runner",
        "runner has received a shutdown signal",
        "failed to create a session",
        "machine provisioner",
        "runner registration has been deleted",
    ];
    for marker in infrastructure_markers {
        if joined.contains(marker) {
            result.label = "runner-failure".into();
            result.confidence = "medium".into();
            result.signals.push(format!(
                "captured log contains runner infrastructure signal {marker:?}"
            ));
            return result;
        }
    }
    if status_affected {
        result.label = "probable-platform-degradation".into();
        result.confidence = "medium".into();
        return result;
    }
    let code_markers = [
        "process completed with exit code",
        "tests failed",
        "test failed",
        "assertion failed",
        "compilation failed",
        "build failed",
    ];
    for marker in code_markers {
        if joined.contains(marker) {
            result.label = "repository-failure".into();
            result.confidence = "medium".into();
            result.signals.push(format!(
                "captured log contains repository process signal {marker:?}"
            ));
            return result;
        }
    }
    if let Some(created) = run.created_at {
        for job in &jobs.jobs {
            if let Some(started) = job.started_at {
                let wait = started - created;
                if wait.num_minutes() >= 10 {
                    result.signals.push(format!(
                        "job {:?} waited about {} minutes before starting",
                        job.name,
                        wait.num_minutes()
                    ));
                }
            }
        }
    }
    if logs.is_empty() {
        result
            .signals
            .push("captured evidence contains no Actions log signal".into());
    }
    if result.signals.is_empty() {
        result.signals.push(
            "captured evidence contains no distinctive code, runner, or public platform signal"
                .into(),
        );
    }
    result
}

pub struct GithubClient {
    agent: ureq::Agent,
    api_root: String,
    status_url: String,
    token: Option<String>,
}

impl GithubClient {
    pub fn new(api_root: &str, status_url: &str, token: Option<String>) -> Self {
        Self {
            agent: ureq::AgentBuilder::new()
                .timeout(Duration::from_secs(45))
                .build(),
            api_root: api_root.trim_end_matches('/').into(),
            status_url: status_url.into(),
            token,
        }
    }

    fn request(&self, url: &str, accept: &str, authenticated: bool) -> Result<Vec<u8>, AnyError> {
        let mut request = self
            .agent
            .get(url)
            .set("Accept", accept)
            .set("User-Agent", &format!("ci-outage-witness/{VERSION}"))
            .set("X-GitHub-Api-Version", "2022-11-28");
        if authenticated && let Some(token) = &self.token {
            request = request.set("Authorization", &format!("Bearer {token}"));
        }
        let response = match request.call() {
            Ok(response) => response,
            Err(ureq::Error::Status(code, response)) => {
                let message = response
                    .into_string()
                    .ok()
                    .and_then(|body| serde_json::from_str::<Value>(&body).ok())
                    .and_then(|value| value.get("message")?.as_str().map(str::to_owned))
                    .unwrap_or_else(|| "request failed".into());
                return Err(format!("request returned {code}: {message}").into());
            }
            Err(error) => return Err(error.into()),
        };
        let mut data = Vec::new();
        response
            .into_reader()
            .take(MAX_RESPONSE_BYTES + 1)
            .read_to_end(&mut data)?;
        if data.len() as u64 > MAX_RESPONSE_BYTES {
            return Err("response exceeds 100 MiB safety limit".into());
        }
        Ok(data)
    }

    fn run_url(&self, repo: &str, suffix: &str) -> String {
        format!(
            "{}/repos/{}/actions/runs/{}",
            self.api_root,
            repo,
            suffix.trim_start_matches('/')
        )
    }

    pub fn run(&self, repo: &str, run_id: u64) -> Result<Run, AnyError> {
        let data = self.request(
            &self.run_url(repo, &run_id.to_string()),
            "application/vnd.github+json",
            true,
        )?;
        Ok(serde_json::from_slice(&data)?)
    }

    pub fn jobs(&self, repo: &str, run_id: u64) -> Result<JobsResponse, AnyError> {
        let mut all = JobsResponse::default();
        for page in 1.. {
            let data = self.request(
                &self.run_url(
                    repo,
                    &format!("{run_id}/jobs?filter=all&per_page=100&page={page}"),
                ),
                "application/vnd.github+json",
                true,
            )?;
            let response: JobsResponse = serde_json::from_slice(&data)?;
            let page_count = response.jobs.len();
            all.total_count = response.total_count;
            all.jobs.extend(response.jobs);
            if page_count < 100 {
                break;
            }
        }
        Ok(all)
    }

    pub fn attempt(&self, repo: &str, run_id: u64, attempt: u32) -> Result<Value, AnyError> {
        let data = self.request(
            &self.run_url(repo, &format!("{run_id}/attempts/{attempt}")),
            "application/vnd.github+json",
            true,
        )?;
        Ok(serde_json::from_slice(&data)?)
    }

    pub fn logs(&self, repo: &str, run_id: u64) -> Result<Vec<EvidenceFile>, AnyError> {
        let data = self.request(
            &self.run_url(repo, &format!("{run_id}/logs")),
            "application/vnd.github+json",
            true,
        )?;
        let mut archive = ZipArchive::new(Cursor::new(data))?;
        let mut files = Vec::new();
        for index in 0..archive.len() {
            let mut entry = archive.by_index(index)?;
            if entry.is_dir() {
                continue;
            }
            let name = safe_archive_path(entry.name());
            let mut contents = Vec::new();
            entry
                .by_ref()
                .take(MAX_RESPONSE_BYTES + 1)
                .read_to_end(&mut contents)?;
            if contents.len() as u64 > MAX_RESPONSE_BYTES {
                return Err("individual log exceeds 100 MiB safety limit".into());
            }
            files.push(EvidenceFile {
                name,
                data: contents,
            });
        }
        Ok(files)
    }

    pub fn status(&self) -> Result<StatusSummary, AnyError> {
        // Never send a GitHub credential to the separate public status host.
        let data = self.request(&self.status_url, "application/json", false)?;
        Ok(serde_json::from_slice(&data)?)
    }
}

pub struct CollectOptions<'a> {
    pub repository: &'a str,
    pub run_id: u64,
    pub no_logs: bool,
    pub runner_logs: &'a [PathBuf],
    pub observed_at: DateTime<Utc>,
}

pub fn collect(client: &GithubClient, options: &CollectOptions<'_>) -> Result<Evidence, AnyError> {
    let observed = options.observed_at;
    let run = client.run(options.repository, options.run_id)?;
    let mut sources = BTreeMap::new();
    sources.insert("run".into(), SourceState::collected(observed, None));

    let jobs = match client.jobs(options.repository, options.run_id) {
        Ok(jobs) => {
            sources.insert(
                "jobs".into(),
                SourceState::collected(observed, Some(format!("{} jobs", jobs.jobs.len()))),
            );
            jobs
        }
        Err(error) => {
            sources.insert("jobs".into(), SourceState::unavailable(observed, error));
            JobsResponse::default()
        }
    };

    let mut attempts = BTreeMap::new();
    for attempt in 1..=run.run_attempt.max(1) {
        match client.attempt(options.repository, options.run_id, attempt) {
            Ok(value) => {
                attempts.insert(attempt, value);
                sources.insert(
                    format!("attempt-{attempt}"),
                    SourceState::collected(observed, None),
                );
            }
            Err(error) => {
                sources.insert(
                    format!("attempt-{attempt}"),
                    SourceState::unavailable(observed, error),
                );
            }
        }
    }

    let log_files = if options.no_logs {
        sources.insert(
            "logs".into(),
            SourceState::not_requested(Some("disabled with --no-logs".into())),
        );
        Vec::new()
    } else {
        match client.logs(options.repository, options.run_id) {
            Ok(logs) => {
                sources.insert(
                    "logs".into(),
                    SourceState::collected(observed, Some(format!("{} files", logs.len()))),
                );
                logs
            }
            Err(error) => {
                sources.insert("logs".into(), SourceState::unavailable(observed, error));
                Vec::new()
            }
        }
    };

    let status = match client.status() {
        Ok(status) => {
            let mut state = SourceState::collected(observed, None);
            state.uncertainty = Some(
                "This is a public status observation at capture time, not historical proof of conditions during the run."
                    .into(),
            );
            sources.insert("github-status".into(), state);
            Some(status)
        }
        Err(error) => {
            sources.insert(
                "github-status".into(),
                SourceState::unavailable(observed, error),
            );
            None
        }
    };

    let mut runner_files = Vec::new();
    if options.runner_logs.is_empty() {
        sources.insert(
            "runner-diagnostics".into(),
            SourceState::not_requested(None),
        );
    } else {
        let mut failure = None;
        for path in options.runner_logs {
            match std::fs::read(path) {
                Ok(data) => runner_files.push(EvidenceFile {
                    name: safe_name(&path.to_string_lossy()),
                    data,
                }),
                Err(error) => failure = Some(format!("{}: {error}", path.display())),
            }
        }
        if let Some(error) = failure {
            sources.insert(
                "runner-diagnostics".into(),
                SourceState::unavailable(observed, error),
            );
        } else {
            sources.insert(
                "runner-diagnostics".into(),
                SourceState::collected(
                    observed,
                    Some(format!("{} local files", runner_files.len())),
                ),
            );
        }
    }

    let mut classification_logs = log_files.clone();
    classification_logs.extend(runner_files.clone());
    let classification = classify(&run, &jobs, status.as_ref(), &classification_logs, observed);
    Ok(Evidence {
        run,
        jobs,
        status,
        attempts,
        log_files,
        runner_files,
        sources,
        classification,
        observed_at: observed,
    })
}

pub fn is_partial(sources: &BTreeMap<String, SourceState>) -> bool {
    sources
        .values()
        .any(|source| source.state != "collected" && source.state != "not-requested")
}

/// Load the realistic, network-free incident used by `--demo` and the site.
pub fn demo_evidence() -> Result<Evidence, AnyError> {
    let observed_at = DateTime::parse_from_rfc3339("2025-07-08T16:32:00Z")?.with_timezone(&Utc);
    let run: Run = serde_json::from_str(include_str!("../examples/demo/run.json"))?;
    let jobs: JobsResponse = serde_json::from_str(include_str!("../examples/demo/jobs.json"))?;
    let status: StatusSummary =
        serde_json::from_str(include_str!("../examples/demo/platform-status.json"))?;
    let attempts = BTreeMap::from([
        (
            1,
            serde_json::from_str(include_str!("../examples/demo/attempt-1.json"))?,
        ),
        (
            2,
            serde_json::from_str(include_str!("../examples/demo/attempt-2.json"))?,
        ),
        (
            3,
            serde_json::from_str(include_str!("../examples/demo/attempt-3.json"))?,
        ),
    ]);
    let mut runner_data = include_bytes!("../examples/demo/runner-journal.txt").to_vec();
    runner_data.extend_from_slice(b"\x1b[31m2025-07-08T16:26:08Z delayed job marker\x1b[0m\n");
    let runner_files = vec![EvidenceFile {
        name: "runner-journal.log".into(),
        data: runner_data,
    }];
    let mut sources = BTreeMap::from([
        ("run".into(), SourceState::collected(observed_at, None)),
        (
            "jobs".into(),
            SourceState::collected(observed_at, Some("2 jobs".into())),
        ),
        (
            "logs".into(),
            SourceState::unavailable(
                observed_at,
                "HTTP 404: logs were not available at capture time",
            ),
        ),
        (
            "runner-diagnostics".into(),
            SourceState::collected(observed_at, Some("1 bundled sample file".into())),
        ),
    ]);
    for attempt in 1..=3 {
        sources.insert(
            format!("attempt-{attempt}"),
            SourceState::collected(observed_at, None),
        );
    }
    let mut status_state = SourceState::collected(
        observed_at,
        Some("Actions reported degraded performance".into()),
    );
    status_state.uncertainty = Some(
        "This is a public status observation at capture time, not proof of conditions throughout the run."
            .into(),
    );
    sources.insert("github-status".into(), status_state);
    let classification = classify(&run, &jobs, Some(&status), &runner_files, observed_at);
    Ok(Evidence {
        run,
        jobs,
        status: Some(status),
        attempts,
        log_files: Vec::new(),
        runner_files,
        sources,
        classification,
        observed_at,
    })
}

pub fn write_bundle(
    output: &Path,
    repository: &str,
    run_id: u64,
    evidence: &Evidence,
    redactor: &mut Redactor,
    force: bool,
) -> Result<(), AnyError> {
    let mut options = OpenOptions::new();
    options.write(true);
    if force {
        options.create(true);
    } else {
        options.create_new(true);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let file = options.open(output)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        file.set_permissions(std::fs::Permissions::from_mode(0o600))?;
    }
    if force {
        file.set_len(0)?;
    }
    let result = write_bundle_contents(file, repository, run_id, evidence, redactor);
    if result.is_err() {
        let _ = std::fs::remove_file(output);
    }
    result
}

fn write_bundle_contents(
    file: File,
    repository: &str,
    run_id: u64,
    evidence: &Evidence,
    redactor: &mut Redactor,
) -> Result<(), AnyError> {
    let mut zip = ZipWriter::new(file);
    let manifest = Manifest {
        schema_version: SCHEMA_VERSION,
        tool_version: VERSION,
        repository,
        run_id,
        observed_at: evidence.observed_at,
        classification: &evidence.classification,
        sources: &evidence.sources,
        attempts: evidence.attempts.keys().copied().collect(),
        share_warning: "Review this bundle before sharing. Pattern-based redaction cannot guarantee removal of arbitrary secrets.",
    };
    add_json(&mut zip, "manifest.json", &manifest, redactor)?;
    add_file(
        &mut zip,
        "summary.md",
        &redactor.redact(summary_markdown(evidence, repository).as_bytes()),
    )?;
    add_json(&mut zip, "evidence/run.json", &evidence.run, redactor)?;
    add_json(&mut zip, "evidence/jobs.json", &evidence.jobs, redactor)?;
    if let Some(status) = &evidence.status {
        add_json(
            &mut zip,
            "evidence/platform-status.json",
            &json!({
                "observed_at": evidence.observed_at,
                "uncertainty": "Public status observed after the fact may not describe conditions at run time and is not proof of root cause.",
                "summary": status,
            }),
            redactor,
        )?;
    }
    for (attempt, value) in &evidence.attempts {
        add_json(
            &mut zip,
            &format!("evidence/attempts/attempt-{attempt}.json"),
            value,
            redactor,
        )?;
    }
    for file in &evidence.log_files {
        add_file(
            &mut zip,
            &format!("logs/{}", safe_archive_path(&file.name)),
            &redactor.redact(&file.data),
        )?;
    }
    for file in &evidence.runner_files {
        add_file(
            &mut zip,
            &format!("runner/{}", safe_name(&file.name)),
            &redactor.redact(&file.data),
        )?;
    }
    let report = serde_json::to_vec_pretty(&redactor.report())?;
    add_file(&mut zip, "redaction-report.json", &report)?;
    zip.finish()?.sync_all()?;
    Ok(())
}

fn add_json<T: Serialize>(
    zip: &mut ZipWriter<File>,
    name: &str,
    value: &T,
    redactor: &mut Redactor,
) -> Result<(), AnyError> {
    let mut data = serde_json::to_vec_pretty(value)?;
    data.push(b'\n');
    add_file(zip, name, &redactor.redact(&data))
}

fn add_file(zip: &mut ZipWriter<File>, name: &str, data: &[u8]) -> Result<(), AnyError> {
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o600);
    zip.start_file(name, options)?;
    zip.write_all(data)?;
    Ok(())
}

fn safe_name(name: &str) -> String {
    let base = Path::new(name)
        .file_name()
        .and_then(|part| part.to_str())
        .unwrap_or("evidence.txt");
    let cleaned: String = base
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || "._-".contains(character) {
                character
            } else {
                '-'
            }
        })
        .collect();
    if cleaned.is_empty() || cleaned == "." {
        "evidence.txt".into()
    } else {
        cleaned
    }
}

fn safe_archive_path(name: &str) -> String {
    let parts: Vec<_> = name
        .replace('\\', "/")
        .split('/')
        .filter(|part| !part.is_empty() && *part != "." && *part != "..")
        .map(safe_name)
        .collect();
    if parts.is_empty() {
        "evidence.txt".into()
    } else {
        parts.join("/")
    }
}

fn summary_markdown(evidence: &Evidence, repository: &str) -> String {
    let mut output = format!(
        "# CI outage witness\n\n**Repository:** `{repository}`  \n**Run:** [{}]({})  \n**Observed:** {}  \n**Evidence label:** {} ({} confidence)\n\n## Why this label\n",
        evidence.run.id,
        evidence.run.html_url,
        evidence.observed_at.format("%Y-%m-%d %H:%M:%S UTC"),
        evidence.classification.label,
        evidence.classification.confidence,
    );
    for signal in &evidence.classification.signals {
        output.push_str(&format!("\n- {signal}"));
    }
    output.push_str(&format!(
        "\n\n> {}\n\n## Run receipt\n\n- Workflow: {}\n- Event: {}\n- Status / conclusion: {} / {}\n- Attempt: {}\n- Jobs observed: {}\n\n## Source state\n",
        evidence.classification.caveat,
        evidence.run.name,
        evidence.run.event,
        evidence.run.status,
        evidence.run.conclusion.as_deref().unwrap_or("not available"),
        evidence.run.run_attempt,
        evidence.jobs.jobs.len(),
    ));
    for (name, source) in &evidence.sources {
        output.push_str(&format!("\n- **{name}:** {}", source.state));
        if let Some(detail) = &source.detail {
            output.push_str(&format!(" — {detail}"));
        }
        if let Some(uncertainty) = &source.uncertainty {
            output.push_str(&format!("\n  - Uncertainty: {uncertainty}"));
        }
    }
    output.push_str("\n\n## Sharing note\n\nPatterns removed recognizable credentials and configured matches before this bundle was written. Pattern matching cannot recognize every arbitrary secret. Review every file before sharing.\n");
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::sync::{Arc, Mutex};
    use std::thread;

    fn minimal_evidence(log: &str) -> Evidence {
        let observed = DateTime::parse_from_rfc3339("2026-08-28T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let run = Run {
            id: 42,
            name: "CI".into(),
            event: "push".into(),
            status: "completed".into(),
            conclusion: Some("failure".into()),
            run_attempt: 2,
            html_url: "https://github.com/acme/api/actions/runs/42".into(),
            created_at: Some(observed),
            ..Run::default()
        };
        let files = if log.is_empty() {
            vec![]
        } else {
            vec![EvidenceFile {
                name: "test.log".into(),
                data: log.as_bytes().to_vec(),
            }]
        };
        let classification = classify(&run, &JobsResponse::default(), None, &files, observed);
        Evidence {
            run,
            jobs: JobsResponse::default(),
            status: None,
            attempts: BTreeMap::from([(1, json!({"id": 42})), (2, json!({"id": 42}))]),
            log_files: files,
            runner_files: vec![],
            sources: BTreeMap::from([
                ("run".into(), SourceState::collected(observed, None)),
                (
                    "logs".into(),
                    SourceState::collected(observed, Some("1 file".into())),
                ),
            ]),
            classification,
            observed_at: observed,
        }
    }

    #[test]
    fn redacts_tokens_assignments_custom_patterns_and_ansi() {
        let mut redactor = Redactor::new(&["customer_[0-9]+".into()]).unwrap();
        let input = b"\x1b[31mTOKEN=hunter2 ghp_abcdefghijklmnopqrstuvwxyz customer_991\x1b[0m";
        let output = String::from_utf8(redactor.redact(input)).unwrap();
        assert!(!output.contains("hunter2"));
        assert!(!output.contains("ghp_"));
        assert!(!output.contains("customer_991"));
        assert!(!output.contains("\x1b"));
        assert_eq!(redactor.report().total_replacements, 3);
    }

    #[test]
    fn redacts_entire_quoted_and_unquoted_sensitive_assignments() {
        let mut redactor = Redactor::new(&[]).unwrap();
        let input = br#"PASSWORD="correct horse battery staple"
SINGLE_PASSWORD='another multi word value'
TOKEN=singleword
AUTHORIZATION: Bearer bearer-token-value"#;
        let output = String::from_utf8(redactor.redact(input)).unwrap();
        assert_eq!(
            output,
            "PASSWORD=[REDACTED]\nSINGLE_PASSWORD=[REDACTED]\nTOKEN=[REDACTED]\nAUTHORIZATION: Bearer [REDACTED]"
        );
        for secret in [
            "correct horse battery staple",
            "another multi word value",
            "singleword",
            "bearer-token-value",
        ] {
            assert!(!output.contains(secret));
        }
    }

    #[test]
    fn prefers_runner_signal_over_generic_failure() {
        let evidence = minimal_evidence(
            "self-hosted runner lost communication with the server; process completed with exit code 1",
        );
        assert_eq!(evidence.classification.label, "runner-failure");
        assert_eq!(evidence.classification.confidence, "medium");
    }

    #[test]
    fn marks_missing_logs_as_inconclusive() {
        let evidence = minimal_evidence("");
        assert_eq!(evidence.classification.label, "inconclusive");
        assert!(evidence.classification.signals[0].contains("no Actions log signal"));
    }

    #[test]
    fn platform_label_requires_temporal_correlation() {
        let observed = DateTime::parse_from_rfc3339("2026-08-28T01:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let status = StatusSummary {
            components: vec![StatusComponent {
                name: "Actions".into(),
                status: "degraded_performance".into(),
            }],
            ..StatusSummary::default()
        };
        let recent = Run {
            created_at: Some(observed - chrono::Duration::minutes(30)),
            updated_at: Some(observed - chrono::Duration::minutes(5)),
            ..Run::default()
        };
        let stale = Run {
            created_at: Some(observed - chrono::Duration::days(2)),
            updated_at: Some(observed - chrono::Duration::days(2)),
            ..Run::default()
        };
        assert_eq!(
            classify(
                &recent,
                &JobsResponse::default(),
                Some(&status),
                &[],
                observed
            )
            .label,
            "probable-platform-degradation"
        );
        assert_eq!(
            classify(
                &stale,
                &JobsResponse::default(),
                Some(&status),
                &[],
                observed
            )
            .label,
            "inconclusive"
        );
    }

    #[test]
    fn writes_a_redacted_shareable_bundle() {
        let mut evidence = minimal_evidence("TOKEN=hunter2\nprocess completed with exit code 1");
        evidence.runner_files.push(EvidenceFile {
            name: "../runner journal.log".into(),
            data: b"Authorization: Bearer very-secret-value".to_vec(),
        });
        let path = std::env::temp_dir().join(format!(
            "ci-outage-witness-test-{}-{}.zip",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap()
        ));
        let mut redactor = Redactor::new(&[]).unwrap();
        write_bundle(&path, "acme/api", 42, &evidence, &mut redactor, false).unwrap();
        let mut archive = ZipArchive::new(File::open(&path).unwrap()).unwrap();
        let names: Vec<_> = archive.file_names().map(str::to_owned).collect();
        assert!(names.contains(&"manifest.json".into()));
        assert!(names.contains(&"summary.md".into()));
        assert!(names.contains(&"runner/runner-journal.log".into()));
        let mut log = String::new();
        archive
            .by_name("logs/test.log")
            .unwrap()
            .read_to_string(&mut log)
            .unwrap();
        assert!(!log.contains("hunter2"));
        assert!(log.contains("[REDACTED]"));
        drop(archive);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        std::fs::remove_file(path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn force_restricts_an_existing_bundle_before_writing() {
        use std::os::unix::fs::PermissionsExt;

        let path = std::env::temp_dir().join(format!(
            "ci-outage-witness-mode-test-{}-{}.zip",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap()
        ));
        std::fs::write(&path, b"old bundle").unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o644)).unwrap();
        let evidence = minimal_evidence("process completed with exit code 1");
        let mut redactor = Redactor::new(&[]).unwrap();

        write_bundle(&path, "acme/api", 42, &evidence, &mut redactor, true).unwrap();

        assert_eq!(
            std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o600
        );
        assert!(ZipArchive::new(File::open(&path).unwrap()).is_ok());
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn collects_run_jobs_attempt_logs_and_status_end_to_end() {
        let mut log_zip = ZipWriter::new(Cursor::new(Vec::new()));
        log_zip
            .start_file("build/1_test.txt", SimpleFileOptions::default())
            .unwrap();
        log_zip
            .write_all(b"Process completed with exit code 1")
            .unwrap();
        let log_zip = log_zip.finish().unwrap().into_inner();

        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let requests = Arc::new(Mutex::new(Vec::new()));
        let recorded = requests.clone();
        let server = thread::spawn(move || {
            for _ in 0..5 {
                let (mut stream, _) = listener.accept().unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(2)))
                    .unwrap();
                let mut buffer = [0_u8; 8192];
                let read = stream.read(&mut buffer).unwrap();
                let request = String::from_utf8_lossy(&buffer[..read]).into_owned();
                recorded.lock().unwrap().push(request.clone());
                let first_line = request.lines().next().unwrap();
                let body = if first_line.contains("/jobs?") {
                    br#"{"total_count":1,"jobs":[{"id":7,"name":"test","status":"completed","conclusion":"failure"}]}"#.to_vec()
                } else if first_line.contains("/attempts/1") {
                    br#"{"id":42,"run_attempt":1}"#.to_vec()
                } else if first_line.contains("/logs ") {
                    log_zip.clone()
                } else if first_line.contains("/status ") {
                    br#"{"status":{"indicator":"none"},"components":[{"name":"Actions","status":"operational"}],"incidents":[]}"#.to_vec()
                } else {
                    br#"{"id":42,"name":"CI","event":"push","status":"completed","conclusion":"failure","run_attempt":1,"created_at":"2026-08-28T00:00:00Z","html_url":"https://github.com/acme/api/actions/runs/42"}"#.to_vec()
                };
                write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    body.len()
                )
                .unwrap();
                stream.write_all(&body).unwrap();
            }
        });

        let root = format!("http://{address}");
        let client = GithubClient::new(&root, &format!("{root}/status"), Some("secret".into()));
        let observed = DateTime::parse_from_rfc3339("2026-08-28T01:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let evidence = collect(
            &client,
            &CollectOptions {
                repository: "acme/api",
                run_id: 42,
                no_logs: false,
                runner_logs: &[],
                observed_at: observed,
            },
        )
        .unwrap();
        server.join().unwrap();

        assert_eq!(evidence.run.id, 42);
        assert_eq!(evidence.jobs.jobs.len(), 1);
        assert_eq!(evidence.attempts.len(), 1);
        assert_eq!(evidence.log_files.len(), 1);
        assert_eq!(evidence.classification.label, "repository-failure");
        assert_eq!(evidence.sources["github-status"].state, "collected");
        let requests = requests.lock().unwrap();
        let status_request = requests
            .iter()
            .find(|request| request.starts_with("GET /status "))
            .unwrap();
        assert!(!status_request.to_lowercase().contains("authorization:"));
        assert!(
            requests
                .iter()
                .filter(|request| !request.starts_with("GET /status "))
                .all(|request| request.contains("Authorization: Bearer secret"))
        );
    }
}
