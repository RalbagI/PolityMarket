#!/usr/bin/env python3
"""
AI-First Workflow Engine
Parses and executes YAML workflows with deterministic execution paths.
Adapted for PoliticMarket (React/Vite) from Tipi (Flutter).
"""

import sys
import re
import logging
import subprocess
import os
import json
from pathlib import Path
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
log = logging.getLogger(__name__)

VALID_WORKFLOW_ID = re.compile(r'^[a-z][a-z0-9-]{0,49}$')

try:
    import yaml  # type: ignore
except ModuleNotFoundError:
    yaml = None


class _SimpleYamlParser:
    """Minimal YAML parser for the project's workflow subset."""

    def __init__(self, text: str):
        self.lines = text.splitlines()
        self.index = 0

    def parse(self) -> Any:
        self._skip_ignorable()
        value = self._parse_block(0)
        self._skip_ignorable()
        return value

    def _skip_ignorable(self) -> None:
        while self.index < len(self.lines):
            stripped = self.lines[self.index].strip()
            if not stripped or stripped.startswith('#'):
                self.index += 1
                continue
            return

    def _peek(self):
        i = self.index
        while i < len(self.lines):
            line = self.lines[i]
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                i += 1
                continue
            indent = len(line) - len(line.lstrip(' '))
            return indent, line[indent:]
        return None

    def _parse_block(self, expected_indent: int) -> Any:
        peeked = self._peek()
        if peeked is None:
            return {}
        indent, content = peeked
        if indent < expected_indent:
            return {}
        if content.startswith('- '):
            return self._parse_list(expected_indent)
        return self._parse_map(expected_indent)

    def _parse_map(self, expected_indent: int) -> dict:
        result = {}
        while True:
            self._skip_ignorable()
            peeked = self._peek()
            if peeked is None:
                break
            indent, content = peeked
            if indent < expected_indent:
                break
            if indent > expected_indent:
                raise ValueError(f"Unexpected indentation at line {self.index + 1}")
            if content.startswith('- '):
                break
            self.index += 1
            key, rest = self._split_key_value(content)
            result[key] = self._parse_value(rest, key_indent=expected_indent)
        return result

    def _parse_list(self, expected_indent: int) -> list:
        items = []
        while True:
            self._skip_ignorable()
            peeked = self._peek()
            if peeked is None:
                break
            indent, content = peeked
            if indent < expected_indent:
                break
            if indent > expected_indent:
                raise ValueError(f"Unexpected indentation at line {self.index + 1}")
            if not content.startswith('- '):
                break
            self.index += 1
            item = content[2:].lstrip()
            if not item:
                items.append(self._parse_nested_or_null(expected_indent + 2))
                continue
            if item == '|':
                items.append(self._parse_literal_block(expected_indent + 2))
                continue
            if self._looks_like_key_value(item):
                key, rest = self._split_key_value(item)
                item_map = {key: self._parse_value(rest, key_indent=expected_indent + 2)}
                item_map.update(self._parse_map_continuation(expected_indent + 2))
                items.append(item_map)
                continue
            items.append(self._parse_inline_scalar(item))
        return items

    def _parse_map_continuation(self, map_indent: int) -> dict:
        result = {}
        while True:
            self._skip_ignorable()
            peeked = self._peek()
            if peeked is None:
                break
            indent, content = peeked
            if indent < map_indent:
                break
            if indent > map_indent:
                raise ValueError(f"Unexpected indentation at line {self.index + 1}")
            if content.startswith('- '):
                break
            self.index += 1
            key, rest = self._split_key_value(content)
            result[key] = self._parse_value(rest, key_indent=map_indent)
        return result

    def _parse_nested_or_null(self, child_indent: int) -> Any:
        peeked = self._peek()
        if peeked is None:
            return None
        indent, _ = peeked
        if indent < child_indent:
            return None
        return self._parse_block(child_indent)

    def _parse_value(self, raw_value: str, key_indent: int) -> Any:
        value = raw_value.strip()
        if value == '':
            return self._parse_nested_or_null(key_indent + 2)
        if value == '|':
            return self._parse_literal_block(key_indent + 2)
        if value in ('>-', '>'):
            return self._parse_folded_block(key_indent + 2, chomp=(value == '>-'))
        return self._parse_inline_scalar(value)

    def _parse_literal_block(self, block_indent: int) -> str:
        lines = []
        while self.index < len(self.lines):
            line = self.lines[self.index]
            stripped = line.strip()
            if not stripped:
                lines.append('')
                self.index += 1
                continue
            indent = len(line) - len(line.lstrip(' '))
            if indent < block_indent:
                break
            lines.append(line[block_indent:])
            self.index += 1
        return '\n'.join(lines).rstrip('\n')

    def _parse_folded_block(self, block_indent: int, chomp: bool = False) -> str:
        """Parse YAML folded scalar (> or >-)."""
        lines = []
        while self.index < len(self.lines):
            line = self.lines[self.index]
            stripped = line.strip()
            if not stripped:
                lines.append('')
                self.index += 1
                continue
            indent = len(line) - len(line.lstrip(' '))
            if indent < block_indent:
                break
            lines.append(line[block_indent:])
            self.index += 1
        # Folded: join lines with spaces instead of newlines
        result = ' '.join(l for l in lines if l).strip()
        if chomp:
            result = result.rstrip('\n')
        return result

    def _looks_like_key_value(self, text: str) -> bool:
        return ':' in text and not text.startswith('"') and not text.startswith("'")

    def _split_key_value(self, text: str):
        if ':' not in text:
            raise ValueError(f"Expected key/value at line {self.index}")
        key, rest = text.split(':', 1)
        return key.strip(), rest.lstrip()

    def _parse_inline_scalar(self, value: str) -> Any:
        if value.startswith('[') and value.endswith(']'):
            inner = value[1:-1].strip()
            if not inner:
                return []
            return [self._parse_inline_scalar(part.strip()) for part in inner.split(',')]
        if value.startswith('"') and value.endswith('"'):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value[1:-1]
        if value.startswith("'") and value.endswith("'"):
            return value[1:-1]
        lowered = value.lower()
        if lowered == 'true':
            return True
        if lowered == 'false':
            return False
        if lowered in {'null', '~'}:
            return None
        if re.fullmatch(r'-?\d+', value):
            return int(value)
        if re.fullmatch(r'-?\d+\.\d+', value):
            return float(value)
        return value


def _load_yaml(content: str) -> Dict[str, Any]:
    if yaml is not None:
        data = yaml.safe_load(content)
        if not isinstance(data, dict):
            raise ValueError("Workflow YAML root must be a mapping")
        return data
    parser = _SimpleYamlParser(content)
    data = parser.parse()
    if not isinstance(data, dict):
        raise ValueError("Workflow YAML root must be a mapping")
    return data


class WorkflowEngine:
    def __init__(self, workflows_dir: str = ".agent/workflows"):
        self.workflows_dir = Path(workflows_dir)
        self.config_dir = Path(".agent/config")
        self.default_timeout_sec = self._read_default_timeout()

    def _read_default_timeout(self) -> int:
        raw_timeout = os.environ.get("WORKFLOW_CMD_TIMEOUT_SEC", "1200")
        try:
            timeout = int(raw_timeout)
            return timeout if timeout > 0 else 1200
        except ValueError:
            return 1200

    def load_workflow(self, workflow_id: str) -> Dict[str, Any]:
        if not VALID_WORKFLOW_ID.match(workflow_id):
            raise ValueError(f"Invalid workflow ID: {workflow_id}")
        workflow_file = self.workflows_dir / f"{workflow_id}.workflow.yaml"
        if not workflow_file.exists():
            raise FileNotFoundError(f"Workflow not found: {workflow_file}")
        with open(workflow_file, 'r') as f:
            return _load_yaml(f.read())

    def execute_cmd(self, cmd: str, fail_action: str = "exit",
                    context: Dict[str, Any] | None = None,
                    timeout_sec: int | None = None):
        effective_timeout = self.default_timeout_sec
        if timeout_sec is not None:
            try:
                parsed_timeout = int(timeout_sec)
                if parsed_timeout > 0:
                    effective_timeout = parsed_timeout
            except (TypeError, ValueError):
                log.warning("Invalid timeout_sec '%s'; using default %ss",
                            timeout_sec, self.default_timeout_sec)
        try:
            env = os.environ.copy()
            if context:
                for key, value in context.items():
                    if value is None:
                        env[key] = ''
                    elif isinstance(value, str):
                        env[key] = value
                    else:
                        env[key] = json.dumps(value)
            result = subprocess.run(
                ['/bin/bash', '-c', cmd],
                capture_output=True, text=True,
                timeout=effective_timeout, env=env
            )
            return result.returncode, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            if fail_action == "exit":
                log.error("Command timed out after %ss: %s", effective_timeout, cmd[:80])
                sys.exit(1)
            return 1, "Command timed out"

    def execute_phase(self, phase: Dict[str, Any], context: Dict[str, Any]) -> bool:
        phase_id = phase.get('id', 'unknown')
        phase_name = phase.get('name', 'unnamed')
        log.info("Phase %s: %s", phase_id, phase_name)
        steps = phase.get('steps', [])
        for step in steps:
            step_name = step.get('name', 'unnamed')
            step_type = step.get('type', 'cmd')
            log.info("  Step: %s (%s)", step_name, step_type)
            if step_type == 'cmd':
                if not self._execute_cmd_step(step, context):
                    return False
            elif step_type == 'check':
                if not self._execute_check_step(step, context):
                    return False
            elif step_type in ['review', 'doc']:
                log.info("    %s step (agent-handled)", step_type.upper())
            else:
                log.warning("    Unknown step type: %s", step_type)
        return True

    def _execute_cmd_step(self, step: Dict[str, Any], context: Dict[str, Any]) -> bool:
        cmd = step.get('cmd')
        fail_action = step.get('fail_action', 'exit')
        store_var = step.get('store')
        timeout_sec = step.get('timeout_sec')
        if isinstance(cmd, list):
            cmd = ' && '.join(cmd)
        log.info("    Running: %s", cmd[:80])
        exit_code, output = self.execute_cmd(cmd, fail_action, context, timeout_sec)
        if exit_code != 0:
            log.error("    Failed with exit code %d", exit_code)
            if fail_action == 'exit':
                sys.exit(1)
            elif fail_action == 'warn':
                log.warning("    %s", output[:100])
        else:
            log.info("    OK")
        if store_var:
            context[store_var] = output.strip()
        return True

    def _execute_check_step(self, step: Dict[str, Any], context: Dict[str, Any]) -> bool:
        check = step.get('check')
        acceptable = step.get('acceptable_failure', [])
        fail_action = step.get('fail_action', 'exit')
        store_var = step.get('store')
        timeout_sec = step.get('timeout_sec')
        log.info("    Checking: %s", check[:80])
        exit_code, output = self.execute_cmd(check, fail_action, context, timeout_sec)
        if exit_code != 0:
            if output.strip() in acceptable or any(a in output for a in acceptable):
                log.info("    Acceptable failure")
                if store_var:
                    context[store_var] = output.strip()
                return True
            log.error("    Check failed")
            if fail_action == 'exit':
                sys.exit(1)
            return False
        log.info("    Check passed")
        if store_var:
            context[store_var] = output.strip()
        return True

    def execute_workflow(self, workflow_id: str) -> bool:
        log.info("Workflow: %s", workflow_id)
        workflow = self.load_workflow(workflow_id)
        metadata = workflow.get('metadata', {})
        log.info("Description: %s", metadata.get('description', 'N/A'))
        workflow_header = workflow.get('workflow', {})
        log.info("Mode: %s", workflow_header.get('mode', workflow.get('mode', 'unknown')))
        context = {}
        phases = workflow.get('phases', [])
        current_phase_id = phases[0].get('id') if phases else None
        phase_map = {p.get('id'): p for p in phases}
        while current_phase_id:
            phase = phase_map.get(current_phase_id)
            if not phase:
                break
            if not self.execute_phase(phase, context):
                log.error("Phase failed: %s", current_phase_id)
                return False
            current_phase_id = phase.get('next_phase')
        log.info("Workflow completed: %s", workflow_id)
        return True


def main():
    if len(sys.argv) < 2:
        log.error("Usage: workflow-engine.py <workflow-id> [args...]")
        sys.exit(1)
    workflow_id = sys.argv[1]
    engine = WorkflowEngine()
    try:
        success = engine.execute_workflow(workflow_id)
        sys.exit(0 if success else 1)
    except (ValueError, FileNotFoundError) as e:
        log.error("%s", e)
        sys.exit(1)


if __name__ == '__main__':
    main()
