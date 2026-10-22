#!/bin/bash
# Fixture: the sample brain from the public template, cloned into the empty workspace.
set -euo pipefail
git clone --quiet --depth 1 https://github.com/mariomile/company-brain-template.git .
git config user.email eval@example.com
git config user.name eval
