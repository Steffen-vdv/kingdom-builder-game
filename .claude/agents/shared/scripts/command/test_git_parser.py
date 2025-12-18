#!/usr/bin/env python3
"""
Tests for git command parsing.

Run with: python3 -m command.test_git_parser
From:     .claude/agents/shared/scripts/
"""

import sys
import unittest

# Add parent to path for relative imports
sys.path.insert(0, __file__.rsplit("/", 2)[0])

from command.parse import parse_command


class TestGitPushDetection(unittest.TestCase):
	"""Tests for detecting git push commands in various forms."""

	def test_simple_git_push(self):
		"""Basic git push should be detected."""
		result = parse_command("git push")
		self.assertTrue(result["supported"])
		self.assertEqual(result["executable"], "git")
		self.assertEqual(result["subcommand"], "push")

	def test_git_push_with_remote_and_branch(self):
		"""git push origin branch should be detected."""
		result = parse_command("git push origin main")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")
		self.assertEqual(result["positional"], ["origin", "main"])

	def test_git_push_with_upstream_flag(self):
		"""git push -u origin branch should be detected."""
		result = parse_command("git push -u origin main")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_push_with_force(self):
		"""git push --force should be detected with force flag."""
		result = parse_command("git push --force origin main")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")
		self.assertTrue(result["flags"].get("force"))

	# ==========================================================================
	# CRITICAL: Tests for git global flags that come BEFORE the subcommand
	# ==========================================================================

	def test_git_with_directory_flag_push(self):
		"""
		SECURITY TEST: git -C /path push must be detected as a push command.

		This was a bypass vector - the -C flag before push caused the parser
		to not recognize push as the subcommand.
		"""
		result = parse_command("git -C /home/user/repo push -u origin main")
		self.assertTrue(
			result["supported"],
			f"git -C /path push should be supported, got: {result}",
		)
		self.assertEqual(result["executable"], "git")
		self.assertEqual(
			result["subcommand"],
			"push",
			f"subcommand should be 'push', got: {result['subcommand']}",
		)

	def test_git_with_short_directory_flag(self):
		"""git -C . push should work."""
		result = parse_command("git -C . push")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_with_config_flag_push(self):
		"""git -c user.name=x push should be detected."""
		result = parse_command("git -c user.name=test push origin main")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_with_git_dir_flag(self):
		"""git --git-dir=/path/.git push should be detected."""
		result = parse_command("git --git-dir=/path/.git push")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_with_work_tree_flag(self):
		"""git --work-tree=/path push should be detected."""
		result = parse_command("git --work-tree=/path push")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_with_no_pager_flag(self):
		"""git --no-pager push should be detected."""
		result = parse_command("git --no-pager push")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_with_multiple_global_flags(self):
		"""git -C /path -c key=val --no-pager push should be detected."""
		result = parse_command("git -C /path -c key=val --no-pager push origin")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "push")

	def test_git_directory_flag_with_commit(self):
		"""git -C /path commit should also work."""
		result = parse_command("git -C /path commit -m 'test'")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "commit")
		self.assertEqual(result["flags"].get("m"), "test")


class TestGitCommitDetection(unittest.TestCase):
	"""Tests for detecting git commit commands."""

	def test_git_commit_amend(self):
		"""git commit --amend should be detected."""
		result = parse_command("git commit --amend")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "commit")
		self.assertTrue(result["flags"].get("amend"))

	def test_git_commit_with_message(self):
		"""git commit -m 'msg' should parse the message."""
		result = parse_command("git commit -m 'test message'")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "commit")
		self.assertEqual(result["flags"].get("m"), "test message")


class TestGitRebaseDetection(unittest.TestCase):
	"""Tests for detecting git rebase commands."""

	def test_git_rebase_interactive(self):
		"""git rebase -i should be detected."""
		result = parse_command("git rebase -i HEAD~3")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "rebase")


class TestGitResetDetection(unittest.TestCase):
	"""Tests for detecting git reset commands."""

	def test_git_reset_hard(self):
		"""git reset --hard should be detected."""
		result = parse_command("git reset --hard HEAD~1")
		self.assertTrue(result["supported"])
		self.assertEqual(result["subcommand"], "reset")
		self.assertTrue(result["flags"].get("hard"))


if __name__ == "__main__":
	unittest.main()
