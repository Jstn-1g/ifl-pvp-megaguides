const requiredRules = [
  ['an explicit 410 error document', /^ErrorDocument\s+410\s+\/archive\/index\.html\s*$/m],
  ['an enabled rewrite engine', /^\s*RewriteEngine\s+On\s*$/m],
  ['a file-preservation condition', /^\s*RewriteCond\s+%\{REQUEST_FILENAME\}\s+!-f\s*$/m],
  ['a directory-preservation condition', /^\s*RewriteCond\s+%\{REQUEST_FILENAME\}\s+!-d\s*$/m],
  ['a terminal Gone rule', /^\s*RewriteRule\s+\^\s+-\s+\[G,L\]\s*$/m],
];

export function checkLegacyRetirementPolicy(contents) {
  const failures = [];
  for (const [label, pattern] of requiredRules) {
    if (!pattern.test(contents)) failures.push(`dist/.htaccess is missing ${label}.`);
  }
  return failures;
}
