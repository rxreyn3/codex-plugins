"""Exercise the pinned validator against disposable valid and invalid packages."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts/vendor/codex-plugin-validator"))
from validate_plugin import validate_plugin


class PluginValidatorTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="plugin-validator-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.manifest = self.root / ".codex-plugin/plugin.json"
        self.manifest.parent.mkdir()
        self.payload = {
            "name": "fixture", "version": "1.0.0", "description": "Fixture plugin",
            "author": {"name": "Fixture"}, "skills": "./skills/",
            "interface": {
                "displayName": "Fixture", "shortDescription": "Fixture",
                "longDescription": "Fixture", "developerName": "Fixture",
                "category": "Productivity", "capabilities": ["Read"],
                "defaultPrompt": ["Use the fixture."],
            },
        }
        self.write_manifest()
        self.skill = self.root / "skills/fixture"
        (self.skill / "agents").mkdir(parents=True)
        (self.skill / "SKILL.md").write_text("---\nname: fixture\ndescription: Fixture skill\n---\n# Fixture\n")
        (self.skill / "agents/openai.yaml").write_text(
            "interface:\n  display_name: Fixture\n  short_description: Fixture\n"
            "policy:\n  allow_implicit_invocation: false\n"
        )

    def write_manifest(self):
        self.manifest.write_text(json.dumps(self.payload))

    def assert_rejected(self, fragment):
        errors = validate_plugin(self.root)
        self.assertTrue(any(fragment in error for error in errors), errors)

    def test_valid_package(self):
        self.assertEqual(validate_plugin(self.root), [])

    def test_missing_or_malformed_manifest(self):
        self.manifest.unlink()
        self.assert_rejected("missing")
        self.manifest.write_text("{broken")
        self.assert_rejected("valid JSON")

    def test_invalid_version_and_unknown_manifest_field(self):
        self.payload["version"] = "latest"
        self.payload["unsupported"] = True
        self.write_manifest()
        self.assert_rejected("strict semver")
        self.assert_rejected("unsupported")

    def test_missing_skill_and_malformed_frontmatter(self):
        skill = self.skill / "SKILL.md"
        skill.unlink()
        self.assert_rejected("missing `SKILL.md`")
        skill.write_text("---\nname: [unclosed\n---\n")
        self.assert_rejected("valid YAML")

    def test_non_boolean_invocation_policy(self):
        (self.skill / "agents/openai.yaml").write_text(
            "interface:\n  display_name: Fixture\n  short_description: Fixture\n"
            'policy:\n  allow_implicit_invocation: "false"\n'
        )
        self.assert_rejected("must be a boolean")

    def test_missing_and_escaping_assets(self):
        self.payload["interface"]["logo"] = "./missing.png"
        self.write_manifest()
        self.assert_rejected("missing file")
        self.payload["interface"]["logo"] = "../outside.png"
        self.write_manifest()
        self.assert_rejected("inside the plugin archive")

    def test_missing_skills_directory_is_an_upstream_limit(self):
        # The repository packaging suite supplies this completeness check.
        import shutil
        shutil.rmtree(self.root / "skills")
        self.assertEqual(validate_plugin(self.root), [])


if __name__ == "__main__":
    unittest.main()
