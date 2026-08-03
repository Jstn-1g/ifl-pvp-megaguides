const privateDeployRule = 'RewriteRule (^|/)\\.deploy-(?:stage|backup|lock)(?:-|/|$) - [F,L,NC]';
const privateDeployPath = /(^|\/)\.deploy-(?:stage|backup|lock)(?:-|\/|$)/i;

const requiredRules = [
  ['an explicit 410 error document', /^ErrorDocument\s+410\s+\/archive\/index\.html\s*$/m],
  ['an enabled rewrite engine', /^\s*RewriteEngine\s+On\s*$/m],
  ['a private deployment-artifact deny rule', privateDeployRule],
  ['a file-preservation condition', /^\s*RewriteCond\s+%\{REQUEST_FILENAME\}\s+!-f\s*$/m],
  ['a directory-preservation condition', /^\s*RewriteCond\s+%\{REQUEST_FILENAME\}\s+!-d\s*$/m],
  ['a terminal Gone rule', /^\s*RewriteRule\s+\^\s+-\s+\[G,L\]\s*$/m],
];

export function checkLegacyRetirementPolicy(contents) {
  const failures = [];
  for (const [label, rule] of requiredRules) {
    const present = typeof rule === 'string' ? contents.includes(rule) : rule.test(contents);
    if (!present) failures.push(`dist/.htaccess is missing ${label}.`);
  }
  const denyIndex = contents.indexOf(privateDeployRule);
  const fileConditionIndex = contents.indexOf('RewriteCond %{REQUEST_FILENAME} !-f');
  const directoryConditionIndex = contents.indexOf('RewriteCond %{REQUEST_FILENAME} !-d');
  if (denyIndex >= 0 && ((fileConditionIndex >= 0 && denyIndex > fileConditionIndex) || (directoryConditionIndex >= 0 && denyIndex > directoryConditionIndex))) {
    failures.push('dist/.htaccess must deny private deployment artifacts before file/directory preservation conditions.');
  }
  return failures;
}

export function isPrivateDeployArtifactPath(path) {
  return privateDeployPath.test(path);
}
