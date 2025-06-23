// This file is used to deploy the Vite app to GitHub Pages
// It uses the gh-pages package to publish the dist folder

const ghpages = require('gh-pages');

ghpages.publish('dist', function(err) {
  if (err) {
    console.error('Deploy failed:', err);
  } else {
    console.log('Deploy complete!');
  }
});
