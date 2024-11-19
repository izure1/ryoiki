/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'Node',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^ryoiki$': ['<rootDir>/src/index.ts']
      }
    },
    {
      preset: 'ts-jest',
      displayName: 'Browser',
      testEnvironment: 'jsdom',
      moduleNameMapper: {
        '^ryoiki$': ['<rootDir>/src/index.ts']
      }
    }
  ],
};
