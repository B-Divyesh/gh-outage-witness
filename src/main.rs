use chrono::Utc;
use ci_outage_witness::{
    CollectOptions, GithubClient, Redactor, ResultSummary, VERSION, collect, demo_evidence,
    is_partial, write_bundle,
};
use clap::{ArgAction, Parser};
use std::path::PathBuf;
use std::process::{Command, ExitCode};

/// Capture a redacted evidence bundle for one GitHub Actions run.
#[derive(Debug, Parser)]
#[command(
    name = "gh outage-witness",
    version = VERSION,
    about,
    long_about = "Capture run metadata, all jobs and rerun attempts, available logs, a timestamped GitHub Status observation, and runner files you explicitly add. Built-in and custom redactions are applied before the ZIP is written.\n\nThe evidence label is conservative and is not a root-cause determination.",
    after_help = "EXAMPLES:\n  gh outage-witness --demo\n  gh outage-witness acme/api 123456789\n  gh outage-witness acme/api 123456789 --runner-log journal.txt --redact 'customer_[0-9]+'\n  gh outage-witness acme/api 123456789 --json --strict\n\nEXIT CODES:\n  0 captured  2 usage  3 run unavailable  4 output error  5 strict partial"
)]
struct Cli {
    /// Repository as OWNER/REPO
    #[arg(value_parser = parse_repository)]
    repository: Option<String>,

    /// Positive GitHub Actions run ID
    run_id: Option<u64>,

    /// Build a network-free sample bundle in a new temporary directory
    #[arg(
        long,
        conflicts_with_all = [
            "repository",
            "run_id",
            "output",
            "runner_logs",
            "redactions",
            "strict",
            "force",
            "no_logs",
            "api_url",
            "status_url"
        ]
    )]
    demo: bool,

    /// Output ZIP path (default: timestamped name)
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Local runner diagnostic file; may be repeated
    #[arg(long = "runner-log", action = ArgAction::Append)]
    runner_logs: Vec<PathBuf>,

    /// Additional Rust regular expression to redact; may be repeated
    #[arg(long = "redact", action = ArgAction::Append)]
    redactions: Vec<String>,

    /// Print a stable JSON result
    #[arg(long)]
    json: bool,

    /// Exit 5 after writing if optional evidence is partial
    #[arg(long)]
    strict: bool,

    /// Replace an existing output file
    #[arg(long)]
    force: bool,

    /// Skip downloading Actions logs
    #[arg(long)]
    no_logs: bool,

    /// GitHub REST API root (supports GitHub Enterprise)
    #[arg(long, default_value_t = default_api_root())]
    api_url: String,

    /// Public GitHub Status summary endpoint
    #[arg(
        long,
        default_value = "https://www.githubstatus.com/api/v2/summary.json"
    )]
    status_url: String,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    match execute(cli) {
        Ok(code) => ExitCode::from(code),
        Err((code, message)) => {
            eprintln!("error: {message}");
            ExitCode::from(code)
        }
    }
}

fn execute(cli: Cli) -> Result<u8, (u8, String)> {
    if cli.demo {
        if cli.repository.is_some() || cli.run_id.is_some() || cli.output.is_some() {
            return Err((
                2,
                "--demo does not accept a repository, run ID, or output path".into(),
            ));
        }
        return execute_demo(cli.json);
    }
    let (repository, run_id) = match (cli.repository, cli.run_id) {
        (Some(repository), Some(run_id)) => (repository, run_id),
        _ => {
            return Err((
                2,
                "provide OWNER/REPO and a positive RUN_ID, or use --demo".into(),
            ));
        }
    };
    if run_id == 0 {
        return Err((2, "RUN_ID must be a positive integer".into()));
    }
    let mut redactor = Redactor::new(&cli.redactions).map_err(|error| (2, error.to_string()))?;
    let token = std::env::var("GH_TOKEN")
        .ok()
        .filter(|value| !value.is_empty())
        .or_else(|| {
            std::env::var("GITHUB_TOKEN")
                .ok()
                .filter(|value| !value.is_empty())
        })
        .or_else(gh_token);
    let client = GithubClient::new(&cli.api_url, &cli.status_url, token);
    let observed_at = Utc::now();
    let evidence = collect(
        &client,
        &CollectOptions {
            repository: &repository,
            run_id,
            no_logs: cli.no_logs,
            runner_logs: &cli.runner_logs,
            observed_at,
        },
    )
    .map_err(|error| {
        (
            3,
            format!(
                "could not collect {} Actions run {}: {error}\nCheck the repository, run ID, network, and read-only token access.",
                repository, run_id
            ),
        )
    })?;
    let output = cli.output.unwrap_or_else(|| {
        PathBuf::from(format!(
            "ci-witness-{}-{}-{}.zip",
            repository.replace('/', "-"),
            run_id,
            observed_at.format("%Y%m%dT%H%M%SZ")
        ))
    });
    write_bundle(
        &output,
        &repository,
        run_id,
        &evidence,
        &mut redactor,
        cli.force,
    )
    .map_err(|error| {
        (
            4,
            format!("could not write bundle {}: {error}", output.display()),
        )
    })?;
    let partial = is_partial(&evidence.sources);
    let result = ResultSummary {
        bundle: output.clone(),
        repository,
        run_id,
        observed_at,
        classification: evidence.classification,
        partial,
    };
    if cli.json {
        println!("{}", serde_json::to_string(&result).unwrap());
    } else {
        println!("Evidence bundle saved to {}", output.display());
        println!(
            "Evidence label: {} ({} confidence)",
            result.classification.label, result.classification.confidence
        );
        if partial {
            println!("Some optional evidence was unavailable; see manifest.json in the bundle.");
        }
        println!("Review every file before sharing.");
    }
    Ok(if cli.strict && partial { 5 } else { 0 })
}

fn execute_demo(json: bool) -> Result<u8, (u8, String)> {
    let evidence = demo_evidence().map_err(|error| (4, format!("could not load demo: {error}")))?;
    let directory = std::env::temp_dir().join(format!(
        "ci-outage-witness-demo-{}-{}",
        std::process::id(),
        Utc::now().timestamp_nanos_opt().unwrap_or_default()
    ));
    std::fs::create_dir(&directory)
        .map_err(|error| (4, format!("could not create demo directory: {error}")))?;
    let output = directory.join("sample-incident.zip");
    let mut redactor = Redactor::new(&["customer_[0-9]+".into()])
        .map_err(|error| (4, format!("could not prepare demo redaction: {error}")))?;
    write_bundle(
        &output,
        "sample-incidents/payments-api",
        44_500_807,
        &evidence,
        &mut redactor,
        false,
    )
    .map_err(|error| (4, format!("could not write demo bundle: {error}")))?;
    let result = ResultSummary {
        bundle: output.clone(),
        repository: "sample-incidents/payments-api".into(),
        run_id: 44_500_807,
        observed_at: evidence.observed_at,
        classification: evidence.classification,
        partial: is_partial(&evidence.sources),
    };
    if json {
        println!("{}", serde_json::to_string(&result).unwrap());
    } else {
        println!("Demo bundle saved to {}", output.display());
        println!("Evidence label: probable-platform-degradation (medium confidence)");
        println!("Sample data only; no network request or GitHub credential was used.");
        println!("Review every file before sharing.");
    }
    Ok(0)
}

fn parse_repository(value: &str) -> Result<String, String> {
    let mut parts = value.split('/');
    let owner = parts.next().unwrap_or_default();
    let repository = parts.next().unwrap_or_default();
    if parts.next().is_some()
        || owner.is_empty()
        || repository.is_empty()
        || !owner.chars().all(valid_repository_character)
        || !repository.chars().all(valid_repository_character)
    {
        return Err(
            "expected OWNER/REPO using letters, numbers, dot, underscore, or hyphen".into(),
        );
    }
    Ok(value.into())
}

fn valid_repository_character(character: char) -> bool {
    character.is_ascii_alphanumeric() || "._-".contains(character)
}

fn gh_token() -> Option<String> {
    let output = Command::new("gh").args(["auth", "token"]).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let token = String::from_utf8(output.stdout).ok()?.trim().to_owned();
    (!token.is_empty()).then_some(token)
}

fn default_api_root() -> String {
    match std::env::var("GH_HOST").ok().as_deref() {
        None | Some("") | Some("github.com") => "https://api.github.com".into(),
        Some(host) => format!("https://{}/api/v3", host.trim_end_matches('/')),
    }
}
