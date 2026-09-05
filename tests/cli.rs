use std::fs;
use std::path::Path;
use std::process::Command;

use serde_json::Value;
use zip::ZipArchive;

#[test]
fn help_documents_evidence_flags_and_exit_codes() {
    let output = Command::new(env!("CARGO_BIN_EXE_gh-outage-witness"))
        .arg("--help")
        .output()
        .unwrap();
    assert!(output.status.success());
    let help = String::from_utf8(output.stdout).unwrap();
    assert!(help.contains("--runner-log"));
    assert!(help.contains("--redact"));
    assert!(help.contains("--json"));
    assert!(help.contains("EXIT CODES"));
}

#[test]
fn invalid_target_uses_the_documented_usage_exit_code() {
    let output = Command::new(env!("CARGO_BIN_EXE_gh-outage-witness"))
        .args(["not-a-repository", "42"])
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn invalid_and_boundary_arguments_return_usage_errors() {
    let binary = env!("CARGO_BIN_EXE_gh-outage-witness");
    for arguments in [
        vec![],
        vec!["acme/api", "0"],
        vec!["acme/api", "42", "--redact", "["],
        vec!["--demo", "acme/api", "42"],
    ] {
        let output = Command::new(binary).args(arguments).output().unwrap();
        assert_eq!(output.status.code(), Some(2));
        assert!(!String::from_utf8_lossy(&output.stderr).trim().is_empty());
    }
}

#[test]
fn demo_writes_a_real_redacted_bundle_in_a_temporary_directory() {
    let output = Command::new(env!("CARGO_BIN_EXE_gh-outage-witness"))
        .args(["--demo", "--json"])
        .env("GH_TOKEN", "unused-demo-token")
        .env("HTTPS_PROXY", "http://127.0.0.1:1")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let result: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(
        result["classification"]["label"],
        "probable-platform-degradation"
    );
    let bundle = result["bundle"].as_str().unwrap();
    assert!(Path::new(bundle).starts_with(std::env::temp_dir()));
    let mut archive = ZipArchive::new(fs::File::open(bundle).unwrap()).unwrap();
    assert!(archive.by_name("manifest.json").is_ok());
    assert!(archive.by_name("evidence/jobs.json").is_ok());
    assert!(archive.by_name("runner/runner-journal.log").is_ok());
    drop(archive);
    fs::remove_dir_all(Path::new(bundle).parent().unwrap()).unwrap();
}
