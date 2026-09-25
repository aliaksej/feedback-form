# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Greenfield: the repository contained no code when this file was created. The sections below describe the intended architecture. Once tooling is chosen and scaffolded, add the real build/lint/test commands (including how to run a single test) here and remove this note.

## Purpose

A webpage with a feedback form. Submissions are sent to an AWS Lambda endpoint, which appends the data to a file in an S3 bucket in Parquet format.

## Architecture

Data flow: `React form` → HTTPS → `Lambda endpoint` → `S3 bucket (Parquet)`

- **Frontend**: React single-page app containing the feedback form. It posts to the Lambda endpoint (e.g. Function URL or API Gateway; not yet decided). The endpoint URL must come from build-time config, not be hardcoded.
- **Lambda**: TypeScript. Validates the payload, converts the feedback records to Parquet, and writes them to S3. Note that S3 objects are immutable, so "putting info into a file" means either writing a new Parquet object per submission/batch or read-modify-write on a shared file. The approach should be an explicit design decision, with concurrency in mind.
- **Infrastructure**: All AWS resources (Lambda, endpoint, S3 bucket, IAM, CORS config, etc.) are defined as Infrastructure as Code. Never create or change resources by hand in the console. The IaC tool (CDK, Terraform, SAM, etc.) is not yet chosen; record the choice here once made.

## Cross-cutting concerns

- **CORS**: the endpoint must allow the frontend's origin; this is configured in the IaC, not just in Lambda code.
- **Schema**: the feedback form fields, the Lambda validation and the Parquet schema must stay in sync. Consider sharing types between frontend and Lambda (both TypeScript-compatible).
- **Lambda bundling**: the Parquet library must work in the Lambda runtime (prefer pure-JS/WASM options or ensure native binaries match the Lambda architecture).
