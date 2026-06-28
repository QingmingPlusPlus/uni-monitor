# 治理规范

## Purpose

定义智能体协作、项目记忆和项目文档的长期治理约束，确保后续开发、评审、排障和文档维护遵循一致的项目规则。

## Requirements

### Requirement: 项目文档使用中文

设计文档、spec 文档、`doc/` 下的说明文档以及其他项目文档必须（MUST）使用中文书写；专有名词、产品名、接口名、代码标识、文件路径和协议名称可以保留原文。

#### Scenario: 编写或更新项目文档

- **WHEN** 智能体编写或更新设计、spec、`doc/` 说明或其他项目文档
- **THEN** 正文内容使用中文表达
- **AND** 专有名词、产品名、接口名、代码标识、文件路径和协议名称可按原文保留

### Requirement: 通用 skill 使用项目级 canonical 目录

项目级通用 skill 必须（MUST）以 `.agents/skills/` 中的目录作为唯一正文来源；`.codex/skills/`、`.opencode/skills/`、`.qoder/skills/` 等 agent 专属目录只能（MUST ONLY）作为发现入口或兼容适配层。

#### Scenario: 为多个 agent 添加同一 skill

- **WHEN** 新增或迁移一个需要被 Codex、opencode、Qoder 等多个 agent 使用的 skill
- **THEN** 正文和长期维护内容写入 `.agents/skills/<skill-name>/`
- **AND** agent 专属目录通过 symlink 或薄适配暴露同一能力
- **AND** 不在多个 agent 专属目录中维护相互独立的完整正文副本
