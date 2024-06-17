# Signalize Contributing Guide

Hi! I'm excited that you are interested in contributing to Signalize.
Before submitting your contribution, please make sure to take a moment and read through the following guidelines:

- [Code of Conduct](https://github.com/signalizejs/signalize/blob/master/.github/CODE_OF_CONDUCT.md)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)

## Issue Reporting Guidelines

- Always use [Github Issues](https://github.com/signalizejs/signalize/issues) to create new issues.
- In case of discussion, checkout [Github Discussions](https://github.com/signalizejs/signalize/discussions) or our [Discord Channel](https://discord.gg/NuJsk5SMDz).

## Pull Request Guidelines

- Submit pull requests against the `maain` branch
- It's OK to have multiple small commits as you work on the PR. Try to split them into logical units (so the changes in commit makes sense).
- Make sure `tests` passes (see [development setup](#development-setup))

- If adding a new feature:
  - Add accompanying test case.
  - Provide a convincing reason to add this feature. Ideally, you should open a suggestion issue first and have it approved before working on it.

- If fixing bug:
  - If you are resolving a special issue, add `(fix #xxxx[,#xxxx])` (#xxxx is the issue id) in your PR title for a better release log, e.g. `Update something (fix #3899)`.
  - Provide a detailed description of the bug in the PR. Live demo preferred.
  - Add appropriate test coverage if applicable.

## Development Setup
- You will [Node.js](http://nodejs.org) >= 22 and [Yarn](https://yarnpkg.com/)
- After cloning the repo, run `yarn i`. This will install dependencies
- You can use `Docker Setup` in this repository through `Docker Compose` or `Visual Studio Dev Containers`.

### Committing Changes

- Commit messages should be self explanatory
- Avoid messages like `Fix, Clenup, Revert, Change, Tunning` and similar.

### NPM scripts
- There are following tasks defined in the root `package.json`:
	- **repo:init**: This will initialize the repository
	- **repo:install-playwright**: This will install playwright
	- **eslint:check**: This run's eslint check
	- **eslint:fix**: This run's eslint check but fixes auto-fixable issues
	- **tests:run**: This will run playwright tests
	- **tests:report**: This will show test rsults

## Project Structure

- **`packages`**: Contains all packages
  - **`packages/*/tests`**: Contains tests for a specific package
  - **`packages/*/src`**: Source code of that package
  - **`packages/*/types`**: Typescript types

## Financial Contribution

In case you use Signalize or like the idea, you can also contribute financially on [Sponsor Page](https://github.com/sponsors/Machy8). Every donation is more then welcome :).

## Credits

Thank you to [all the people who have already contributed](https://github.com/signalizejs/signalize/graphs/contributors) to Signalize!
