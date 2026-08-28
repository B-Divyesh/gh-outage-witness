use std::process::Command;

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
