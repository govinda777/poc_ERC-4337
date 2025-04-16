module.exports = {
  default: {
    paths: ['test/features/**/*.feature'],
    require: ['test/features/steps/**/*.js'],
    format: ['progress', 'html:cucumber-report.html'],
    parallel: 1
  }
}; 