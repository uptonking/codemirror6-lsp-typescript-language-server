// module.exports = {
export default {
  // verbose: true,
  // roots: ['<rootDir>'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/config/setupTests.js'],
  // transformIgnorePatterns: ['^.+\\.js$'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest'],
    // '\\.[jt]sx?$': ['ts-jest'],
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$':
      'jest-transform-stub',
  },
  moduleNameMapper: {
    '^.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$':
      'jest-transform-stub',
  },
  // testMatch: [
  //   '<rootDir>/src/**/*.test.(ts|tsx)',
  //   '<rootDir>/**/*.test.(ts|tsx)',
  // ],
};
