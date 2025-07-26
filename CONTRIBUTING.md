# Contributing to Pensieve

Thank you for your interest in contributing to Pensieve! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git
- Obsidian (for testing)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/pensieve.git
   cd pensieve
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Plugin**
   ```bash
   npm run build
   ```

4. **Link to Obsidian**
   ```bash
   npm run copy
   ```
   This copies the built plugin to your Obsidian plugins folder for testing.

### Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit source files in `src/`
   - Test your changes in Obsidian
   - Rebuild with `npm run build`

3. **Test Your Changes**
   - Enable the plugin in Obsidian
   - Test all affected functionality
   - Check for console errors

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style Guidelines

### JavaScript/JSX
- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use arrow functions where appropriate
- Follow camelCase for variables and functions
- Use PascalCase for components and classes

### File Organization
- Keep related functionality together
- Use descriptive file names
- Group imports logically
- Export only what's necessary

### Comments and Documentation
- Add JSDoc comments for public functions
- Explain complex logic with inline comments
- Keep comments up to date with code changes

## Testing

### Manual Testing
- Test all LLM providers (OpenAI, Gemini, Anthropic, Ollama)
- Test with different vault structures
- Test automation features
- Test error handling

### Automated Testing
```bash
npm test
```

### Test Coverage
- Aim for at least 80% test coverage
- Test both success and error scenarios
- Test edge cases and boundary conditions

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] No console errors in Obsidian
- [ ] Feature works with all supported LLM providers

### PR Description
- Describe the problem being solved
- Explain the solution approach
- List any breaking changes
- Include screenshots for UI changes
- Reference related issues

### Review Process
- All PRs require at least one review
- Address review comments promptly
- Keep PRs focused and manageable
- Update PR if requested changes are made

## Issue Reporting

### Bug Reports
- Use the bug report template
- Include steps to reproduce
- Provide error messages and logs
- Specify your environment (OS, Obsidian version, etc.)

### Feature Requests
- Use the feature request template
- Explain the use case
- Describe the expected behavior
- Consider implementation complexity

## Development Tips

### Debugging
- Use `console.log()` for debugging
- Check Obsidian's developer console
- Use browser dev tools for UI debugging
- Test with different data sets

### Performance
- Monitor API call frequency
- Optimize large note processing
- Consider caching strategies
- Profile memory usage

### Security
- Never commit API keys
- Validate user input
- Sanitize data before processing
- Follow security best practices

## Release Process

### Version Bumping
- Use semantic versioning
- Update `manifest.json` and `package.json`
- Update changelog
- Tag releases appropriately

### Pre-release Checklist
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Changelog is complete
- [ ] Version numbers are updated
- [ ] Build is successful

## Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the project's code of conduct

### Communication
- Use GitHub issues for discussions
- Join community discussions
- Share your experiences and use cases
- Help with documentation and examples

## Getting Help

- Check existing issues and discussions
- Ask questions in GitHub discussions
- Review the documentation
- Look at existing code examples

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation
- Community acknowledgments

Thank you for contributing to Pensieve! 🧠✨ 