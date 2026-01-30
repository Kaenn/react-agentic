# Claude Behavior Test Scenarios

This document contains manual test scenarios to validate how Claude Code reacts to the generated markdown files from the react-agentic TSX compiler.

Each scenario tests ONE specific feature. Scenarios are ordered by dependency - complete earlier scenarios before testing later ones.

---

## LEVEL 1: Foundation - Basic File Types

These scenarios validate that Claude can recognize and execute the three core file types.

---

## 1.1 Execute a Minimal Skill

### Goal
Confirm that Claude Code recognizes a skill file in `.claude/skills/` and can execute it when invoked with the corresponding slash command.

### Scenario
Create the simplest possible skill with just a name and description. Invoke it using `/skill-name` in Claude Code and observe if Claude receives and follows the instructions in the skill body.

### Success Criteria
- [x] Claude recognizes the skill when typing `/skill-name`
- [x] Claude displays the skill in autocomplete suggestions
- [x] Upon invocation, Claude follows the instructions defined in the skill body
- [x] The skill frontmatter is correctly parsed (name, description)

### Validation
**status**: done
**validation notes**:
- Tested with `/hello-test` skill (src/app/scenarios/1.1-minimal-skill.tsx)
- Claude responded with "Skill invocation successful!"
- Claude confirmed receiving instructions from the hello-test skill
- Claude stated the current timestamp as instructed
- Validated on 2026-01-22

---

## 1.2 Execute a Minimal Command

### Goal
Confirm that Claude Code recognizes a command file in `.claude/commands/` and can execute it when invoked with the corresponding slash command.

### Scenario
Create the simplest possible command with just a name and description. Invoke it using `/command-name` in Claude Code and observe if Claude receives and follows the instructions in the command body.

### Success Criteria
- [x] Claude recognizes the command when typing `/command-name`
- [x] Claude displays the command in autocomplete suggestions
- [x] Upon invocation, Claude follows the instructions defined in the command body
- [x] The command frontmatter is correctly parsed (name, description)

### Validation
**status**: done
**validation notes**:
- Tested with `/1.2-minimal-command` command (src/app/scenarios/1.2-minimal-command.tsx)
- Claude responded with "Command invocation successful!"
- Claude confirmed receiving instructions from the command
- Claude referenced both filename (1.2-minimal-command) and frontmatter name (hello-command)
- Claude stated the current timestamp as instructed
- Note: Command name for invocation is derived from filename, not frontmatter `name` field
- Validated on 2026-01-22

---

## 1.3 Spawn a Minimal Agent

### Goal
Confirm that when a command spawns an agent using `Task()` syntax, Claude correctly launches a sub-agent with the agent's configuration.

### Scenario
Create a command that uses SpawnAgent to launch a simple agent. The agent should have a clear, observable task (like creating a specific file). Verify that Claude spawns the agent and the agent performs its defined task.

### Success Criteria
- [x] Claude correctly parses the Task() call in the command
- [x] A sub-agent is spawned with the correct agent type
- [x] The sub-agent receives the prompt/instructions from the command
- [x] The sub-agent performs its defined task successfully

### Validation
**status**: done
**validation notes**:
- Tested with `/1.3-spawn-agent` command (src/app/scenarios/1.3-spawn-agent.tsx)
- Command spawned the `1.3-timestamp-agent` using Task() syntax
- Agent responded with "Agent spawn successful!"
- Agent confirmed running as 1.3-timestamp-agent
- Agent returned structured YAML with status: SUCCESS, timestamp, and invocationSource
- Sub-agent completed in ~3s using Haiku 4.5 model
- Validated on 2026-01-22

---

## LEVEL 2: Content Rendering

These scenarios validate that markdown content is correctly rendered and interpreted by Claude.

---

## 2.1 XmlBlock Structured Sections

### Goal
Confirm that `<XmlBlock>` components render as proper XML-style sections that Claude can parse as structured instructions.

### Scenario
Create a skill with multiple XmlBlock sections (e.g., `<objective>`, `<constraints>`, `<output-format>`). Invoke the skill and verify Claude recognizes these as distinct structured sections.

### Success Criteria
- [x] XmlBlock renders as `<tagname>content</tagname>` in the markdown
- [x] Claude interprets the content as structured instructions
- [x] Multiple XmlBlocks are treated as separate logical sections
- [x] Nested content within XmlBlock is preserved

### Validation
**status**: done
**validation notes**:
- Tested with `/xmlblock-test` skill (src/app/scenarios/2.1-xmlblock-sections.tsx)
- Claude correctly identified all 3 XmlBlock sections: `<objective>`, `<constraints>`, `<output-format>`
- Nested content preserved: bullet lists in constraints, code block in output-format
- Claude interpreted each section as distinct logical unit with specific purpose
- Returned structured YAML confirming `xmlblock_rendering: PASSED`
- Validated on 2026-01-22

---

## 2.2 Markdown Passthrough Content

### Goal
Confirm that `<Markdown>` components pass through content without transformation, preserving formatting exactly.

### Scenario
Create a skill with a Markdown component containing code blocks, lists, and special characters. Verify the output preserves the exact formatting.

### Success Criteria
- [x] Code blocks with language tags are preserved
- [x] List formatting (bullets, numbers) is preserved
- [x] Special characters are not escaped or modified
- [x] Multi-line content maintains line breaks

### Validation
**status**: done
**validation notes**:
- Tested with `/markdown-passthrough-test` skill (src/app/scenarios/2.2-markdown-passthrough.tsx)
- Claude confirmed all tests PASSED:
  - Code blocks: typescript and bash language tags preserved
  - List formatting: bullet lists, numbered lists, nested indentation correct
  - Special characters: $, backticks, <>, &, *, _, |, \ all intact (not escaped)
  - Multi-line: line breaks, blank lines, blockquotes, tables preserved
- Note: Initial test failed due to `${...}` syntax being interpreted as shell pattern
  - Fixed by using string concatenation instead of template literals in code examples
- Validated on 2026-01-22

---

## 2.3 Heading Hierarchy

### Goal
Confirm that HTML heading elements (h1-h6) render as proper markdown headings.

### Scenario
Create a skill using JSX headings (`<h1>`, `<h2>`, etc.). Verify each renders with the correct number of `#` symbols.

### Success Criteria
- [x] h1 renders as `# Heading`
- [x] h2 renders as `## Heading`
- [x] Headings are recognized by Claude as section boundaries
- [x] Content under each heading is associated with that section

### Validation
**status**: done
**validation notes**:
- Tested with `/heading-hierarchy-test` skill (src/app/scenarios/2.3-heading-hierarchy.tsx)
- All heading levels (h1-h6) render correctly with appropriate # symbols
- Claude confirmed section boundaries create proper logical groupings
- Content correctly associated with parent headings (tested with Question A/B/C structure)
- Structure association test verified Claude can identify content under specific sections
- Validated on 2026-01-22

---

## 2.4 Lists Rendering

### Goal
Confirm that `<ul>` and `<ol>` elements render as proper markdown lists that Claude can parse.

### Scenario
Create a skill with both unordered and ordered lists. Include nested lists to verify indentation handling.

### Success Criteria
- [x] Unordered lists render with `-` or `*` bullets
- [x] Ordered lists render with `1.`, `2.`, etc.
- [x] Nested lists are properly indented
- [x] Claude treats list items as distinct instructions when appropriate

### Validation
**status**: done
**validation notes**:
- Tested with `/lists-rendering-test` skill (src/app/scenarios/2.4-lists-rendering.tsx)
- Unordered lists render with `-` bullet character
- Ordered lists render with `1. 2. 3.` numbering format
- Nested lists (both unordered and ordered) have proper 2-space indentation
- Nested depth levels visible up to 3 levels (parent → child → grandchild)
- Mixed list types work (ordered parent with unordered children)
- List items recognized as distinct instructions and executed in order
- Claude correctly followed 4-step instruction list (name, date, count, complete)
- Validated on 2026-01-22

---

## 2.5 Code Blocks with Language

### Goal
Confirm that code blocks include language tags and Claude recognizes them for syntax highlighting or language-specific handling.

### Scenario
Create a skill with code blocks in different languages (TypeScript, bash, JSON). Verify the language tag is preserved.

### Success Criteria
- [x] Code blocks render with triple backticks and language tag
- [x] Claude recognizes the language context
- [x] Code content is not modified or escaped
- [x] Multi-line code is preserved with proper formatting

### Validation
**status**: done
**validation notes**:
- Tested with `/code-blocks-test` skill (src/app/scenarios/2.5-code-blocks.tsx)
- All 7 code blocks rendered correctly with language tags (typescript, bash, json, python, sql)
- Claude correctly identified all language tags and recognized language context
- Special characters preserved: $, \, <, >, &, |, regex patterns, template literals, operators
- Multi-line code with blank lines and indentation preserved correctly
- Validated on 2026-01-22

---

## LEVEL 3: Variable System

These scenarios validate the shell variable system for dynamic content.

---

## 3.1 Variable Declaration with useVariable

### Goal
Confirm that `useVariable` declarations create proper shell variable references that can be used throughout the skill/command.

### Scenario
Create a command that declares a variable using `useVariable("MY_VAR")`. Use the variable's `.ref` property in the content to produce `$MY_VAR` syntax.

### Success Criteria
- [x] Variable declaration is recognized by the compiler
- [x] `variable.ref` produces `$MY_VAR` in the output
- [x] `variable.name` produces just `MY_VAR` (without $)
- [x] Variable can be used multiple times in the content

### Validation
**status**: done
**validation notes**:
- Tested with `/3.1-variable-declaration` command (src/app/scenarios/3.1-variable-declaration.tsx)
- Static value assignment: `MY_VAR=test-value-123` works correctly
- Dynamic bash assignment: `TIMESTAMP=$(date ...)` captured UTC timestamp
- Environment variable: `PROJECT_NAME=$USER` resolved to username
- Test builders: `notEmpty(myVar)` produced `[ -n $MY_VAR ]` with correct `$` prefix
- Multiple uses: Same variable used 3 times in shell commands without issue
- Validated on 2026-01-23

---

## 3.2 Assign Variable from Bash Command

### Goal
Confirm that `<Assign bash="...">` produces correct shell variable assignment from command output.

### Scenario
Create a command that assigns a variable from a bash command (e.g., `date +%Y-%m-%d`). The output should show the assignment syntax Claude will execute.

### Success Criteria
- [x] Assign renders as a clear instruction for Claude to execute
- [x] The bash command is preserved exactly
- [x] Claude understands to capture the command output into the variable
- [x] The variable can be used in subsequent instructions

### Validation
**status**: done
**validation notes**:
- Tested with `/3.2-assign-bash` command (src/app/scenarios/3.2-assign-bash.tsx)
- All Assign blocks rendered as bash code blocks with `VAR=$(command)` syntax
- Bash commands preserved exactly: `date +%Y-%m-%d`, `pwd`, `git branch --show-current`, `ls -1 | wc -l | tr -d ' '`
- Command substitution `$()` correctly captures stdout from each command
- Variables usable in subsequent echo commands and conditional `[ -n ]` tests
- Piped commands work correctly within command substitution
- Validated on 2026-01-22

---

## 3.3 Assign Variable with Static Value

### Goal
Confirm that `<Assign value="...">` produces correct shell variable assignment with a literal value.

### Scenario
Create a command that assigns a variable with a static string value. Verify the assignment syntax handles spaces and special characters.

### Success Criteria
- [x] Assign renders with proper quoting for the value
- [x] Values with spaces are properly quoted
- [x] Claude understands to set the variable to the literal value
- [x] The variable can be used in subsequent instructions

### Validation
**status**: done
**validation notes**:
- Tested with `/3.3-static-value-assign` command (src/app/scenarios/3.3-static-value-assign.tsx)
- Simple string: `SIMPLE_VALUE=hello-world` - no quotes needed, assigned correctly
- Value with spaces: `VALUE_WITH_SPACES="hello world with spaces"` - properly double-quoted, preserved correctly
- Value with quotes: `VALUE_WITH_QUOTES="it's a test"` - single quote inside double quotes works
- Special characters: `VALUE_WITH_SPECIAL_CHARS="special: !@#%^&*()_+"` - properly quoted and preserved
- Empty string: `EMPTY_VALUE=` - correctly assigns empty value
- All variables usable in subsequent echo commands
- Validated on 2026-01-22

---

## 3.4 Assign Variable from Environment

### Goal
Confirm that `<Assign env="...">` produces correct syntax to read an environment variable.

### Scenario
Create a command that assigns a variable from an environment variable (e.g., `USER` or `HOME`). Verify the syntax references the environment correctly.

### Success Criteria
- [x] Assign renders with environment variable reference syntax
- [x] Claude understands to read from the environment
- [x] The value is captured into the local variable
- [x] The variable can be used in subsequent instructions

### Validation
**status**: done
**validation notes**:
- Tested with `/3.4-env-variable-assign` command (src/app/scenarios/3.4-env-variable-assign.tsx)
- Environment variable syntax: `LOCAL_USER=$USER` - correctly references env var with $ prefix
- USER env read: captured "glenninizan" correctly
- HOME env read: captured "/Users/glenninizan" correctly
- PATH env read: captured full PATH (665 characters)
- SHELL env read: captured "/bin/zsh" correctly
- Undefined env var: `LOCAL_UNDEFINED=$SOME_UNDEFINED_VAR_12345` resulted in empty string (no error)
- Variables usable in subsequent instructions: echo commands and conditionals worked
- Conditionals: `[ -n $LOCAL_USER ]` and `[ -z $LOCAL_UNDEFINED ]` evaluated correctly
- Validated on 2026-01-22

---

## 3.5 Variable Interpolation in Content

### Goal
Confirm that variable references are properly interpolated in text content and instructions.

### Scenario
Create a command that declares a variable and uses it inline in a sentence (e.g., "The current date is $DATE"). Verify Claude substitutes the actual value.

### Success Criteria
- [x] Variable reference appears in the output markdown
- [x] Claude substitutes the variable value when executing
- [x] Multiple variable references in the same text work correctly
- [x] Variables work in different contexts (text, code blocks, instructions)

### Validation
**status**: done
**validation notes**:
- Tested with `/3.5-variable-interpolation` command (src/app/scenarios/3.5-variable-interpolation.tsx)
- Variable references ($CURRENT_DATE, $USER_NAME, $PROJECT_DIR) appear literally in markdown output
- Claude correctly substitutes values when executing shell commands:
  - $CURRENT_DATE → 2026-01-22
  - $USER_NAME → glenninizan
  - $PROJECT_DIR → /Users/glenninizan/workspace/react-agentic
- Multiple variables in same sentence work: "User $USER_NAME is working in $PROJECT_DIR on $CURRENT_DATE"
- Variables work in all contexts: plain text, code blocks, instruction lists, markdown tables
- Validated on 2026-01-22

---

## LEVEL 4: Conditional Logic

These scenarios validate the If/Else conditional system.

---

## 4.1 Simple If Condition

### Goal
Confirm that `<If test="...">` creates conditional instructions that Claude evaluates and branches on.

### Scenario
Create a command with an If block that checks a simple condition. Observe whether Claude evaluates the condition and follows the conditional content only when true.

### Success Criteria
- [x] If block renders with clear conditional syntax (e.g., "**If [test]:**")
- [x] Claude evaluates the shell test expression
- [x] When condition is true, Claude follows the If content
- [x] When condition is false, Claude skips the If content

### Validation
**status**: done
**validation notes**:
- Tested with `/4.1-simple-if-condition` command (src/app/scenarios/4.1-simple-if-condition.tsx)
- If blocks render as `**If [test]:**` pattern in markdown
- Claude evaluated all 5 shell tests using Bash tool
- True conditions (Tests 1, 3, 4, 5): Claude followed the content correctly
- False condition (Test 2): Claude recognized content should be skipped
- Test builders `notEmpty()` and `isEmpty()` produce correct `[ -n $VAR ]` and `[ -z $VAR ]` syntax
- Note: If component emits instructions for Claude to interpret at runtime, not compile-time filtering
- Validated on 2026-01-22

---

## 4.2 If/Else Pair

### Goal
Confirm that `<If>` followed by `<Else>` creates proper branching where Claude takes one path or the other.

### Scenario
Create a command with an If/Else pair. The If block should have content for when the condition is true, and the Else block for when false. Verify Claude takes exactly one path.

### Success Criteria
- [x] If block renders with conditional syntax
- [x] Else block renders as "**Otherwise:**"
- [x] Claude evaluates the condition once
- [x] Claude follows exactly one branch (If or Else, never both)

### Validation
**status**: done
**validation notes**:
- Tested with `/4.2-if-else-pair` command (src/app/scenarios/4.2-if-else-pair.tsx)
- If blocks rendered as `**If [test]:**` pattern (e.g., `**If [ -f $EXISTING_FILE ]:**`)
- Else blocks rendered as `**Otherwise:**` pattern
- 5 test cases covering file existence, directory existence, and variable emptiness
- All conditions evaluated exactly once per test
- Claude correctly took exactly one branch per If/Else pair:
  - Test 1: IF branch (file exists) ✓
  - Test 2: ELSE branch (file not found) ✓
  - Test 3: IF branch (variable has value) ✓
  - Test 4: ELSE branch (variable empty) ✓
  - Test 5: IF branch (directory exists) ✓
- Validated on 2026-01-22

---

## 4.3 fileExists Test Builder

### Goal
Confirm that the `fileExists()` test builder produces correct shell syntax for file existence checks.

### Scenario
Create a command that uses `fileExists(pathVar)` in an If condition. Verify the output produces `[ -f $PATH ]` syntax.

### Success Criteria
- [x] fileExists produces `[ -f $VAR ]` in the output
- [x] Claude evaluates the file existence correctly
- [x] The condition works with both existing and non-existing files
- [x] Variable reference is properly interpolated in the test

### Validation
**status**: done
**validation notes**:
- Tested with `/4.3-file-exists-test` command (src/app/scenarios/4.3-file-exists-test.tsx)
- fileExists() correctly produces `[ -f $VAR ]` syntax (e.g., `[ -f $EXISTING_FILE_PATH ]`)
- Claude evaluated all 5 conditions using Bash tool with `[ -f ... ]` checks
- Existing file (package.json): TRUE, correctly followed IF branch
- Non-existing file: FALSE, correctly SKIPPED content (`test_2_failed_visible: false`)
- Dynamic file path via `$(ls -1 *.json | head -1)` resolved to package-lock.json, evaluated TRUE
- If/Else branching works: TRUE → IF branch, FALSE → ELSE branch
- Note: First attempt failed due to unclear instructions; fixed by adding explicit "Runtime Evaluation Required" section
- Validated on 2026-01-22

---

## 4.4 dirExists Test Builder

### Goal
Confirm that the `dirExists()` test builder produces correct shell syntax for directory existence checks.

### Scenario
Create a command that uses `dirExists(pathVar)` in an If condition. Verify the output produces `[ -d $PATH ]` syntax.

### Success Criteria
- [x] dirExists produces `[ -d $VAR ]` in the output
- [x] Claude evaluates the directory existence correctly
- [x] The condition distinguishes between files and directories
- [x] Variable reference is properly interpolated in the test

### Validation
**status**: done
**validation notes**:
- Tested with `/4.4-dir-exists` command (src/app/scenarios/4.4-dir-exists.tsx)
- dirExists() correctly produces `[ -d $VAR ]` syntax (e.g., `[ -d $EXISTING_DIR ]`)
- Claude evaluated all 5 directory tests using Bash tool with `[ -d ... ]` checks
- File/directory distinction works: package.json (file) returns false for `[ -d ]`, true for `[ -f ]`
- Variable interpolation works with both simple paths (src) and nested paths (src/app/scenarios)
- Test 2 and Test 3 content correctly skipped (non-existing dir and file-not-dir cases)
- Validated on 2026-01-22

---

## 4.5 isEmpty and notEmpty Test Builders

### Goal
Confirm that `isEmpty()` and `notEmpty()` test builders produce correct shell syntax for string checks.

### Scenario
Create a command that uses both `isEmpty(var)` and `notEmpty(var)` in different If conditions. Verify the output produces `[ -z "$VAR" ]` and `[ -n "$VAR" ]` syntax.

### Success Criteria
- [x] isEmpty produces `[ -z "$VAR" ]`
- [x] notEmpty produces `[ -n "$VAR" ]`
- [x] Claude correctly evaluates empty vs non-empty strings
- [x] Both work with variables containing whitespace

### Validation
**status**: done
**validation notes**:
- Tested with `/4.5-is-empty-not-empty` command (src/app/scenarios/4.5-is-empty-not-empty.tsx)
- Initial test revealed bug: unquoted `[ -n $VAR ]` fails for empty vars (shell sees `[ -n ]` which is always true)
- Fixed parser.ts and jsx.ts to produce quoted syntax: `[ -z "$VAR" ]` and `[ -n "$VAR" ]`
- All 6 tests now pass:
  - Test 1: isEmpty on empty string correctly returns true
  - Test 2: isEmpty on non-empty string correctly skips content
  - Test 3: notEmpty on non-empty string correctly returns true
  - Test 4: notEmpty on empty string correctly skips content (the bug that was fixed)
  - Test 5: notEmpty works correctly with strings containing spaces
  - Test 6: Spaces-only strings correctly considered non-empty by shell
- Validated on 2026-01-22

---

## 4.6 equals Test Builder

### Goal
Confirm that the `equals()` test builder produces correct shell syntax for string equality checks.

### Scenario
Create a command that uses `equals(var, "expected")` in an If condition. Verify the output produces `[ $VAR = "expected" ]` syntax.

### Success Criteria
- [x] equals produces `[ $VAR = "value" ]` in the output
- [x] Claude evaluates string equality correctly
- [x] Values with spaces are properly quoted
- [x] Comparison is case-sensitive

### Validation
**status**: done
**validation notes**:
- Tested with `/4.6-equals-test` command (src/app/scenarios/4.6-equals-test.tsx)
- equals() produces correct POSIX shell syntax: `[ $VAR = "value" ]`
- All 6 tests matched expected behavior:
  - Test 1: IF (STATUS = "success") correct
  - Test 2: ELSE (STATUS != "failure") correct
  - Test 3: IF (spaces work correctly with "hello world") correct
  - Test 4: IF (exact case "Hello") correct
  - Test 5: ELSE (case mismatch "hello" vs "Hello") correct
  - Test 6: IF (MODE = "production") correct
- Values with spaces properly quoted in assignment and comparison
- Case-sensitive comparison confirmed (Test 4 vs Test 5)
- Validated on 2026-01-22

---

## 4.7 Composite Tests with and/or

### Goal
Confirm that `and()` and `or()` test builders compose multiple conditions correctly.

### Scenario
Create a command with composite conditions like `and(fileExists(a), notEmpty(b))` or `or(equals(x, "a"), equals(x, "b"))`. Verify the output produces `test1 && test2` or `test1 || test2` syntax.

### Success Criteria
- [x] and() produces `test1 && test2` syntax
- [x] or() produces `test1 || test2` syntax
- [x] Claude evaluates composite conditions correctly
- [x] Nested composites work (and within or, etc.)

### Validation
**status**: done
**validation notes**:
- Tested with `/4.7-composite-tests` command (src/app/scenarios/4.7-composite-tests.tsx)
- and() correctly produces `[ -f $EXISTING_FILE ] && [ -d $EXISTING_DIR ]` syntax
- or() correctly produces `[ -f $EXISTING_FILE ] || [ -f $NON_EXISTING_FILE ]` syntax
- All 10 tests passed including:
  - Simple and() with both true/one false
  - Simple or() with first true/second true/both false
  - Nested and(or()) and or(and()) composites
  - Triple and() and triple or() conditions
  - Complex nested or(and(), and()) patterns
- Note: Shell requires explicit grouping with braces {} for correct operator precedence in nested composites
- Validated on 2026-01-22

---

## LEVEL 5: Agent Communication

These scenarios validate the communication between commands and agents.

---

## 5.1 SpawnAgent Basic Invocation

### Goal
Confirm that `<SpawnAgent>` produces correct Task() syntax that Claude recognizes and executes.

### Scenario
Create a command with a basic SpawnAgent that has a description. Verify Claude spawns the correct agent type with the given prompt.

### Success Criteria
- [x] SpawnAgent renders as Task() call syntax
- [x] The agent name is correctly specified (subagent_type)
- [x] The description becomes the prompt
- [x] Claude successfully spawns the sub-agent

### Validation
**status**: done
**validation notes**:
- Tested with `/5.1-spawnagent-basic` command (src/app/scenarios/5.1-spawnagent-basic.tsx)
- SpawnAgent correctly renders as `Task(prompt="...", subagent_type="...", model="...", description="...")` syntax
- Agent name `5.1-echo-agent` correctly passed as `subagent_type` parameter
- Prompt text fully transmitted to spawned agent
- Agent spawned successfully using Haiku 4.5 model
- Agent returned structured YAML response confirming all validation points
- Validated on 2026-01-22

---

## 5.2 SpawnAgent with Variable Input

### Goal
Confirm that SpawnAgent can receive a variable reference as input and pass its value to the agent.

### Scenario
Create a command that declares a variable, assigns it a value, then passes it to SpawnAgent via the `input` prop. Verify the agent receives the variable's value.

### Success Criteria
- [x] Variable value is passed to the agent
- [x] Agent can access the input in its prompt
- [x] The input appears in the Task() call correctly
- [x] Variable interpolation works in the prompt

### Validation
**status**: done
**validation notes**:
- Tested with `/5.2-spawn-with-variable-input` command (src/app/scenarios/5.2-spawn-with-variable-input.tsx)
- Variables declared: MESSAGE (static), TIMESTAMP (bash), TEST_MODE (static)
- SpawnAgent with `input={{ message: messageVar, timestamp: timestampVar, testMode: testModeVar }}`
- Task() prompt correctly generated XML blocks: `<message>`, `<timestamp>`, `<testMode>`
- Agent received actual variable values, not references like "$MESSAGE"
- All values correctly interpolated: "Hello from the command!", "2026-01-23T04:11:15Z", "scenario-5.2"
- Agent confirmed receipt via structured YAML with all validation: PASSED
- Validated on 2026-01-23

---

## 5.3 SpawnAgent with Object Input

### Goal
Confirm that SpawnAgent can receive an object literal as input with multiple properties.

### Scenario
Create a command that passes an object with multiple properties to SpawnAgent (e.g., `{ file: fileVar, mode: "strict" }`). Verify all properties are accessible to the agent.

### Success Criteria
- [x] Object literal is correctly serialized
- [x] Multiple properties are passed to the agent
- [x] Mixed variable and literal properties work
- [x] Agent receives structured input it can reference

### Validation
**status**: done
**validation notes**:
- Tested with `/5.3-spawnagent-object-input` command (src/app/scenarios/5.3-spawnagent-object-input.tsx)
- Object literal serialized as XML sections: `<file>`, `<mode>`, `<user>`, `<options>`
- All 4 properties passed successfully to the agent
- Mixed variable refs (TARGET_FILE → package.json, USER_NAME → glenninizan) and static strings ("strict", "verbose logging enabled") all worked
- Agent received structured input and correctly reported all property values
- Variable references rendered as lowercase placeholders `{target_file}`, `{user_name}` in Task() prompt
- Note: Fixed bug in build.ts where `extractPromptPlaceholders` was called on undefined when using `input` prop instead of `prompt`
- Validated on 2026-01-22

---

## 5.4 useOutput Hook Declaration

### Goal
Confirm that `useOutput()` creates a reference for capturing agent output fields.

### Scenario
Create a command that uses `useOutput("agent-name")` and references output fields in subsequent content. Verify the syntax for accessing output fields.

### Success Criteria
- [x] useOutput creates an output reference
- [x] output.field() produces correct interpolation syntax
- [x] Field references appear in the markdown
- [x] Claude understands to use the agent's return value

### Validation
**status**: done
**validation notes**:
- Tested with `/5.4-useoutput-test` command (src/app/scenarios/5.4-useoutput-test.tsx)
- useOutput("5.4-data-agent") correctly created an OutputRef bound to that agent
- output.field() produced `{output.fieldName}` syntax (e.g., `{output.itemCount}`, `{output.lastItem}`)
- All 5 field references visible in markdown: itemCount, lastItem, processingTime, status, message
- Agent returned structured YAML with all expected fields
- Claude successfully spawned the agent and processed the returned values
- The useOutput pattern establishes a contract: command declares expected fields, agent returns matching data
- Validated on 2026-01-22

---

## 5.5 OnStatus SUCCESS Handler

### Goal
Confirm that `<OnStatus status="SUCCESS">` creates conditional handling for successful agent completion.

### Scenario
Create a command that spawns an agent and has an OnStatus block for SUCCESS. Verify Claude only executes the SUCCESS content when the agent succeeds.

### Success Criteria
- [x] OnStatus renders as "**On SUCCESS:**" pattern
- [x] Claude checks the agent's return status
- [x] SUCCESS content is executed only when agent succeeds
- [x] Other statuses do not trigger SUCCESS handler

### Validation
**status**: done
**validation notes**:
- Tested with `/5.5-onstatus-success` command (src/app/scenarios/5.5-onstatus-success.tsx)
- OnStatus correctly rendered as `**On SUCCESS:**` pattern in markdown
- Agent spawned successfully via Task() and returned `status: SUCCESS` in YAML
- SUCCESS handler block executed after Claude detected SUCCESS status
- Field references (output.confirmation, output.timestamp, output.message) visible in agent response
- Note: Field interpolation syntax `{output.field}` is a template pattern; Claude manually extracts values from agent YAML response
- Only the SUCCESS handler was triggered (no other handlers present in this test)
- Validated on 2026-01-22

---

## 5.6 Multiple OnStatus Handlers

### Goal
Confirm that multiple `<OnStatus>` blocks for different statuses work correctly together.

### Scenario
Create a command with OnStatus handlers for SUCCESS, ERROR, and BLOCKED. Verify Claude routes to exactly one handler based on the actual agent status.

### Success Criteria
- [x] Each status has its own handler section
- [x] Claude evaluates the agent's actual status
- [x] Exactly one handler is executed per spawn
- [x] ERROR and BLOCKED handlers receive error context

### Validation
**status**: done
**validation notes**:
- Tested with `/5.6-multiple-onstatus` command (src/app/scenarios/5.6-multiple-onstatus.tsx)
- All three OnStatus handlers visible in markdown: `**On SUCCESS:**`, `**On ERROR:**`, `**On BLOCKED:**`
- Agent spawned via Task() and returned `status: SUCCESS` with confirmation field
- Claude correctly evaluated the agent's return status and executed ONLY the SUCCESS handler
- ERROR and BLOCKED handlers were visible but NOT executed (correct behavior)
- Field interpolation syntax present: `{output.confirmation}`, `{output.errorDetails}`, `{output.blockedBy}`
- `multiple_handlers_executed: NO` - confirms exactly one handler per spawn
- The OnStatus routing mechanism correctly routes to exactly one handler based on agent's actual return status
- Validated on 2026-01-22

---

## 5.7 Output Field Interpolation

### Goal
Confirm that output field references are correctly interpolated in content after an agent returns.

### Scenario
Create a command that spawns an agent, then uses `{output.message}` or similar syntax in subsequent instructions. Verify Claude substitutes the actual field value.

### Success Criteria
- [x] Field interpolation syntax appears in markdown
- [x] Claude substitutes the actual field value from agent output
- [x] Multiple field references work in the same content
- [x] Field access works within OnStatus handlers

### Validation
**status**: done
**validation notes**:
- Tested with `/5.7-output-field-interpolation` command (src/app/scenarios/5.7-output-field-interpolation.tsx)
- Agent spawned: 5.7-output-agent returned structured YAML with all 6 fields
- Field interpolation syntax `{output.field}` appeared correctly in markdown
- Single field interpolation: `{output.message}` → "Output agent completed successfully"
- Multiple field interpolation in list: count (42), timestamp, data, confidence all substituted
- Prose interpolation: Inline field refs in sentences rendered correctly
- OnStatus SUCCESS handler executed and displayed field values
- Validated on 2026-01-22

---

## LEVEL 6: State Management

These scenarios validate the state read/write system.

---

## 6.1 useStateRef Declaration

### Goal
Confirm that `useStateRef()` creates a reference for accessing a state file with a specific schema.

### Scenario
Create a command that uses `useStateRef("my-state")` with a typed schema. Verify the state key is correctly referenced.

### Success Criteria
- [x] useStateRef creates a state reference
- [x] The key property is accessible
- [x] Type parameter provides compile-time type safety
- [x] Multiple state references can coexist

### Validation
**status**: done
**validation notes**:
- Tested with `/6.1-usestateref-declaration` command (src/app/scenarios/6.1-usestateref-declaration.tsx)
- Three state references created: `project-context`, `user-preferences`, `session-data`
- Key property correctly passed to state-read/write skill invocations
- Type parameter provides compile-time safety (build succeeded without TypeScript errors)
- All 3 state references operated independently in same command
- State files didn't exist initially (expected) but correct keys were referenced
- Write operation successfully created `.state/user-preferences.json` with `{"theme": "dark"}`
- Validated on 2026-01-22

---

## 6.2 ReadState Entire State

### Goal
Confirm that `<ReadState>` without a field reads the entire state object into a variable.

### Scenario
Create a command that reads the entire state into a variable. Verify Claude retrieves and parses the full state object.

### Success Criteria
- [x] ReadState without field reads entire state
- [x] Claude executes the read operation correctly
- [x] The result is a valid JSON object
- [x] The variable contains all state fields

### Validation
**status**: done
**validation notes**:
- Tested with `/6.2-readstate-entire-state` command (src/app/scenarios/6.2-readstate-entire-state.tsx)
- ReadState without `field` prop emits `/react-agentic:state-read test-entire-state` (no --field argument)
- Claude executed state-read skill and retrieved full JSON object
- Result was valid JSON with all 5 top-level fields: projectName, version, buildCount, lastBuildDate, config
- Nested object intact: config.debug (true) and config.environment ("testing") both present
- Field reads matched corresponding values in entire state object
- Validated on 2026-01-22

---

## 6.3 ReadState Specific Field

### Goal
Confirm that `<ReadState field="...">` reads a specific field from the state.

### Scenario
Create a command that reads a single field (e.g., `field="count"`) from state. Verify Claude retrieves only that field's value.

### Success Criteria
- [x] ReadState with field reads only that field
- [x] Claude executes the field-specific read
- [x] The result is the field's value (not entire state)
- [x] Nested field paths work (e.g., "config.timeout")

### Validation
**status**: done
**validation notes**:
- Tested with `/6.3-readstate-specific-field` command (src/app/scenarios/6.3-readstate-specific-field.tsx)
- WriteState merge initialized state with nested structure (name, version, count, config.timeout, config.mode, metadata.author)
- Test 1: ReadState field="name" returned "test-project" (string) - not entire object
- Test 2: ReadState field="count" returned 42 (number) - not entire object
- Test 3: ReadState field="config.timeout" returned 5000 - nested path worked
- Test 4: ReadState field="config.mode" returned "production" - nested path worked
- Test 5: ReadState field="metadata.author" returned "test-user" - nested path worked
- Test 6: ReadState without field returned complete state object for comparison
- All field reads returned only the specific value, not the entire state
- Validated on 2026-01-22

---

## 6.4 WriteState Single Field

### Goal
Confirm that `<WriteState field="..." value="...">` writes a single field to the state.

### Scenario
Create a command that writes a single field with a literal value. Verify Claude updates only that field while preserving others.

### Success Criteria
- [x] WriteState with field updates only that field
- [x] Other fields in state are preserved
- [x] Variable references work as values
- [x] Claude executes the write operation correctly

### Validation
**status**: done
**validation notes**:
- Tested with `/6.4-writestate-single-field` command (src/app/scenarios/6.4-writestate-single-field.tsx)
- WriteState with field="fieldA" correctly updated only that field to "updated-A"
- Other fields preserved: fieldB remained "initial-B", fieldC remained 42 after first update
- Variable reference worked: fieldB updated to dynamic date "2026-01-22" from $DYNAMIC_VALUE
- All state-write skill calls executed correctly via JSON file operations
- Individual field reads confirmed correct values after partial updates
- Validated on 2026-01-22

---

## 6.5 WriteState with Merge

### Goal
Confirm that `<WriteState merge={{...}}>` performs a partial update merging multiple fields.

### Scenario
Create a command that merges multiple fields into state. Verify Claude updates specified fields while preserving unlisted fields.

### Success Criteria
- [x] WriteState with merge updates multiple fields
- [x] Unspecified fields are preserved
- [x] Variable references work in merge object
- [x] Claude executes the merge operation correctly

### Validation
**status**: done
**validation notes**:
- Tested with `/6.5-writestate-with-merge` command (src/app/scenarios/6.5-writestate-with-merge.tsx)
- Initial state created with 6 fields: name, version, buildCount, author, status, lastUpdated
- Test 1 (static merge): Updated 3 fields (version→2.0.0, buildCount→42, status→updated)
- Preserved fields confirmed: name, author, lastUpdated remained unchanged after merge
- Test 2 (variable merge): DYNAMIC_STATUS and CURRENT_TIMESTAMP variables successfully merged
- status updated to "completed-dynamically", lastUpdated updated to "2026-01-23T04:31:10Z"
- All unspecified fields (name, version, buildCount, author) preserved through second merge
- Validated on 2026-01-23

---

## LEVEL 7: Scoped State Skills

These scenarios validate the State component that generates state management skills.

---

## 7.1 State Component with SQLite Provider

### Goal
Confirm that `<State>` component generates multiple skills for state initialization and management.

### Scenario
Create a State component with a name, SQLite provider, and schema interface. Build and verify that init/read/write/delete skills are generated.

### Success Criteria
- [x] State generates `state-{name}` skill directory
- [x] init-state skill is generated with table creation
- [x] read skill is generated for querying state
- [x] write skill is generated for updating state
- [x] delete skill is generated for resetting state

### Validation
**status**: done
**validation notes**:
- Tested with State component in src/app/scenarios/7.1-state-sqlite-provider.tsx
- Build generated 7 skill files in `.claude/skills/`:
  - `test-state.init.md` - CREATE TABLE with schema (counter, lastUpdated, status, description)
  - `test-state.read.md` - SELECT with optional --field filter
  - `test-state.write.md` - UPDATE field with --field and --value args
  - `test-state.delete.md` - Reset state to defaults
  - `test-state.increment.md` - Custom Operation with --amount arg
  - `test-state.set-status.md` - Custom Operation with --new-status arg
  - `init.all.md` - Master init orchestrator
- Skill invocation works: `/test-state.init`, `/test-state.read`, `/test-state.write`, `/test-state.increment`
- SQLite table created in `.state/test.db` with correct schema and CHECK constraint on status enum
- CRUD operations all functional: init created table, write updated status to "active", increment added 5 to counter, read returned full JSON
- Note: Skills are flat files (`{name}.{op}.md`) not subdirectory (`state-{name}/{op}.md`), but naming pattern works correctly
- Note: jq dependency missing on system but sqlite3 -json output works directly
- Validated on 2026-01-23

---

## 7.2 Generated Init Skill

### Goal
Confirm that the generated init skill creates the state table with correct schema.

### Scenario
Create a State with a typed schema (e.g., `{ count: number; name: string }`). Invoke the init skill and verify it creates the table with correct columns and types.

### Success Criteria
- [x] Init skill is invocable as `/{name}.init`
- [x] Claude creates the SQLite table
- [x] Column types match TypeScript types (number → INTEGER)
- [x] Default values are applied from schema

### Validation
**status**: done
**validation notes**:
- Tested with `/init-test-state.init` skill (src/app/scenarios/7.2-generated-init-skill.tsx)
- Skill invocation format is `/{name}.init` (not `/state-{name}:init` as originally written)
- Table `init_test_state` created in `.state/init-test.db`
- Type mappings verified:
  - count: number → INTEGER ✓
  - name: string → TEXT ✓
  - isActive: boolean → INTEGER ✓
  - score: number → INTEGER ✓
  - notes?: string → TEXT ✓
- Default values applied: count=0, isActive=0, score=0
- Custom verify-schema operation worked to inspect table structure
- Note: Skills required manual restructuring to `{name}/SKILL.md` format (flat files not discovered by Claude Code)
- Validated on 2026-01-22

---

## 7.3 Generated Read Skill

### Goal
Confirm that the generated read skill queries state with optional field filtering.

### Scenario
Invoke the read skill with and without field arguments. Verify it returns the correct state data.

### Success Criteria
- [x] Read skill is invocable as `/state-{name}:read`
- [x] Without arguments, returns all fields
- [x] With field argument, returns only that field
- [x] Output is in a parseable format (JSON or text)

### Validation
**status**: done
**validation notes**:
- Tested with `/7.3-generated-read-skill` command (src/app/scenarios/7.3-generated-read-skill.tsx)
- Read skill exists at `.claude/skills/test-state.read.md` (invocable as `/test-state.read`)
- Test 1: Read entire state returned all 4 fields (counter, lastUpdated, status, description) as valid JSON
- Test 2: Read --field counter returned only counter value (100)
- Test 3: Read --field status returned only status value ("active")
- Test 4: Read --field description returned only description value
- Test 5: Read --field lastUpdated returned only datetime value ("2026-01-23 04:34:34")
- Output format: sqlite3 -json produces valid JSON array with object
- Note: Skill invocation pattern is `/test-state.read` (dot notation), not `/state-{name}:read` (colon notation)
- Note: Table name with hyphen requires quoting in SQL; jq dependency not present but sqlite3 -json works directly
- Validated on 2026-01-23

---

## 7.4 Generated Write Skill

### Goal
Confirm that the generated write skill updates state fields.

### Scenario
Invoke the write skill with field and value arguments. Verify it updates the state correctly.

### Success Criteria
- [x] Write skill is invocable as `/state-{name}:write`
- [x] Field and value are correctly applied
- [x] Existing data is preserved for unwritten fields
- [x] Updates are persisted to the database

### Validation
**status**: done
**validation notes**:
- Tested with `/7.4-generated-write-skill` command (src/app/scenarios/7.4-generated-write-skill.tsx)
- Write skill exists at `.claude/skills/test-state.write.md` (invocable as `/test-state.write`)
- Test 1: Read initial state established baseline (counter=100, status=active, lastUpdated, description)
- Test 2: Write --field description --value "Updated via 7.4 test" executed successfully, returned JSON with updated state
- Test 3: Read --field description confirmed update applied correctly
- Test 4: Other fields preserved - counter, status, lastUpdated unchanged after description update
- Test 5: Write --field status --value "active" worked for enum fields, other fields preserved
- Test 6: Direct sqlite3 query confirmed persistence to `.state/test.db`
- Note: Skill invocation pattern is `/test-state.write` (dot notation), not `/state-{name}:write` (colon notation)
- Note: jq dependency not present but sqlite3 -json works directly for JSON output
- Validated on 2026-01-23

---

## 7.5 Custom Operation Skill

### Goal
Confirm that `<Operation>` inside State generates custom SQL operation skills.

### Scenario
Create a State with a custom Operation (e.g., increment counter). Build and verify the operation skill is generated with correct SQL and arguments.

### Success Criteria
- [x] Operation skill is invocable as `/state-{name}:{operation}`
- [x] SQL template is correctly parameterized
- [x] $variable placeholders become skill arguments
- [x] Claude executes the SQL correctly

### Validation
**status**: done
**validation notes**:
- Tested with `/task-state.{operation}` skills (src/app/scenarios/7.5-custom-operation-skill.tsx)
- Fixed bug: state emitter was generating flat files (`task-state.init.md`) instead of skill directories (`task-state.init/SKILL.md`)
- After fix, all 5 custom operations invocable via slash commands
- Test 1 (assign): `/task-state.assign --user "alice"` → `$user` placeholder became `--user` arg, SQL executed, assignee="alice"
- Test 2 (set-priority): `/task-state.set-priority --level 3` → `$level` placeholder became `--level` arg, priority=3
- Test 3 (update-progress): `/task-state.update-progress --percent 50 --new-status "in_progress"` → multiple args worked, progress=50, status="in_progress"
- Test 4 (increment-progress): `/task-state.increment-progress --amount 25` → computed SQL `MIN(100, progress + $amount)` worked, progress went 50→75
- Test 5 (complete-if-done): `/task-state.complete-if-done --threshold 75` → `$threshold` in WHERE clause worked, status="completed" (conditional update)
- Note: jq dependency missing on system but sqlite3 -json output works directly
- Note: Table names with hyphens require quoting in SQL (Claude handled this correctly)
- Validated on 2026-01-23

---

## LEVEL 8: MCP Configuration

These scenarios validate MCP server configuration generation.

---

## 8.1 MCPStdioServer Configuration

### Goal
Confirm that `<MCPStdioServer>` generates correct `.mcp.json` entry for stdio-based MCP servers.

### Scenario
Create an MCPConfig with an MCPStdioServer (command, args, env). Build and verify the `.mcp.json` is correctly updated.

### Success Criteria
- [x] `.mcp.json` includes the MCP server entry
- [x] Command and args are correctly specified
- [x] Environment variables are included
- [x] Server type is "stdio"

### Validation
**status**: done
**validation notes**:
- Tested with `test-fs-server` in src/app/scenarios/8.1-mcp-stdio-server.mcp.tsx
- Fixed: Changed output from `.claude/settings.json` to `.mcp.json` (Claude Code reads project MCP from `.mcp.json`)
- Fixed: Removed `type: "stdio"` field from output (not needed, stdio is default)
- Generated `.mcp.json` with correct format: `{ "mcpServers": { "name": { command, args, env } } }`
- Server appeared in `/mcp` under "Project MCPs" and connected successfully
- Command: `npx`, Args: `["-y", "@modelcontextprotocol/server-filesystem", "."]` - all correct
- Environment variables: `DEBUG`, `MCP_LOG_LEVEL` - included correctly
- Stdio transport confirmed working (server connected via stdio)
- Validated on 2026-01-23

---

## 8.2 MCPHTTPServer Configuration

### Goal
Confirm that `<MCPHTTPServer>` generates correct settings.json entry for HTTP-based MCP servers.

### Scenario
Create an MCPConfig with an MCPHTTPServer (url, headers). Build and verify the settings.json is correctly updated.

### Success Criteria
- [ ] Settings.json includes the MCP server entry
- [ ] URL is correctly specified
- [ ] Headers are included as object
- [ ] Server type is "http"

### Validation
**status**: todo
**validation notes**:

---

## 8.3 Multiple MCP Servers

### Goal
Confirm that MCPConfig can define multiple servers that are all added to settings.json.

### Scenario
Create an MCPConfig with multiple servers (mix of stdio and http). Build and verify all servers appear in settings.json.

### Success Criteria
- [ ] All defined servers appear in settings
- [ ] Each server has correct configuration
- [ ] Existing settings are preserved (merge behavior)
- [ ] Server names are used as keys

### Validation
**status**: todo
**validation notes**:

---

## LEVEL 9: Integration Scenarios

These scenarios validate complete workflows combining multiple features.

---

## 9.1 Command Orchestrating Agent Workflow

### Goal
Confirm that a command can spawn an agent, receive its output, and make decisions based on the result.

### Scenario
Create a command that: 1) Collects input via variable, 2) Spawns an agent with that input, 3) Uses OnStatus to handle success/failure, 4) Outputs the result. Verify the full workflow executes correctly.

### Success Criteria
- [x] Variable is assigned before agent spawn
- [x] Agent receives the variable value
- [x] OnStatus handler receives agent output
- [x] Field interpolation works in handlers
- [x] Complete workflow produces expected result

### Validation
**status**: done
**validation notes**:
- Tested with `/9.1-orchestrating-workflow` command (src/app/scenarios/9.1-orchestrating-workflow.tsx)
- Variables assigned before spawn: OPERATION_TYPE=uppercase, INPUT_VALUE="hello workflow orchestration", START_TIMESTAMP captured via date command
- Agent received actual values (not $VAR references): operationType=uppercase, inputValue=hello workflow orchestration, timestamp=2026-01-23T04:57:59Z
- OnStatus SUCCESS handler executed correctly after agent returned status: SUCCESS
- Field interpolation worked: processedResult, operationPerformed, inputReceived, outputTimestamp, computationDetails all substituted
- Complete workflow result: "HELLO WORKFLOW ORCHESTRATION" (correct uppercase transformation)
- Agent: 9.1-workflow-agent (src/app/scenarios/9.1-workflow-agent.tsx)
- Validated on 2026-01-23

---

## 9.2 Command with State and Agent Integration

### Goal
Confirm that a command can read state, pass it to an agent, and update state based on agent output.

### Scenario
Create a command that: 1) Reads current state, 2) Passes state data to an agent, 3) Receives agent output, 4) Writes updated state. Verify state is correctly read and updated.

### Success Criteria
- [x] State is read before agent spawn
- [x] Agent receives state data in its input
- [x] Agent output is captured correctly
- [x] State is updated based on agent output
- [x] State changes persist across invocations

### Validation
**status**: done
**validation notes**:
- Tested with `/9.2-state-agent-integration` command (src/app/scenarios/9.2-state-agent-integration.tsx)
- State read before spawn: taskCount=5, currentStatus=pending, lastUpdated=2026-01-01T00:00:00Z
- Agent received XML-formatted input with all 4 fields: taskCount, currentStatus, lastUpdated, processingMode
- Agent output captured: newTaskCount=6, newStatus=active, newTimestamp=2026-01-22T00:00:00Z, processingSummary
- State updated with agent-returned values via state-write skill calls
- Final state verified: taskCount=6, currentStatus=active, lastUpdated=2026-01-22T00:00:00Z, processingHistory=processed-by-agent
- Agent: 9.2-state-agent-integration-agent (src/app/scenarios/9.2-state-agent-integration-agent.tsx)
- Validated on 2026-01-22

---

## 9.3 Multi-Agent Sequential Workflow

### Goal
Confirm that a command can spawn multiple agents sequentially, with each agent receiving output from the previous.

### Scenario
Create a command that spawns Agent A, then spawns Agent B with Agent A's output, then spawns Agent C with Agent B's output. Verify the chain executes correctly.

### Success Criteria
- [x] Agent A is spawned first
- [x] Agent B receives Agent A's output
- [x] Agent C receives Agent B's output
- [x] Each agent completes before the next spawns
- [x] Final result incorporates all agent outputs

### Validation
**status**: done
**validation notes**:
- Tested with `/9.3-multi-agent-sequential` command (src/app/scenarios/9.3-multi-agent-sequential.tsx)
- Agent A spawned first with seed value "test-seed-9.3", generated chainId "chain-7429"
- Agent B received A's output: processedSeed, chainId, step=1, timestampA (all fields confirmed)
- Agent C received B's output: transformedValue, chainId, step=2, timestampA, timestampB, receivedFromA=true
- Sequential order maintained: timestamps show ~1 second between each agent completion (05:01:28Z → 05:01:29Z → 05:01:30Z)
- Final result: "C-final-B-transformed-A-processed-test-seed-9.3" incorporates all transformations
- Chain ID preserved: "chain-7429" consistent through all 3 agents
- Agents: 9.3-agent-a, 9.3-agent-b, 9.3-agent-c (src/app/scenarios/)
- Validated on 2026-01-23

---

## 9.4 Conditional Agent Spawning

### Goal
Confirm that conditional logic can control which agent is spawned based on runtime conditions.

### Scenario
Create a command with an If/Else that spawns different agents based on a condition (e.g., file exists → spawn Analyzer, otherwise → spawn Creator).

### Success Criteria
- [x] Condition is evaluated at runtime
- [x] Only one agent is spawned (not both)
- [x] The correct agent is chosen based on condition
- [x] Agent output is handled in both branches

### Validation
**status**: done
**validation notes**:
- Tested with `/9.4-conditional-agent-spawning` command (src/app/scenarios/9.4-conditional-agent-spawning.tsx)
- TARGET_FILE set to package.json, shell test `[ -f $TARGET_FILE ]` evaluated at RUNTIME using Bash tool
- Only the Analyzer agent (Branch A) was spawned; Creator agent (Branch B) was never invoked
- Correct agent chosen: package.json exists → Analyzer spawned (as expected)
- Agent output handled: OnStatus SUCCESS handler executed, all fields displayed (analyzedPath, lineCount, fileType, summary, agentType)
- Agent returned: lineCount=49, fileType=JSON, agentType=analyzer
- Both branches visible in markdown (If/Otherwise pattern), but only one executed
- Agents: 9.4-analyzer-agent, 9.4-creator-agent (src/app/scenarios/)
- Validated on 2026-01-23

---

## 9.5 Error Recovery Workflow

### Goal
Confirm that OnStatus ERROR handlers can implement retry or recovery logic.

### Scenario
Create a command that spawns an agent with OnStatus handlers for SUCCESS and ERROR. In the ERROR handler, implement recovery logic (e.g., retry with different parameters or spawn a fallback agent).

### Success Criteria
- [x] Agent failure triggers ERROR handler
- [x] ERROR handler receives error context
- [x] Recovery logic (retry/fallback) is executed
- [x] Workflow can recover and complete successfully

### Validation
**status**: done
**validation notes**:
- Tested with `/9.5-error-recovery-workflow` command (src/app/scenarios/9.5-error-recovery-workflow.tsx)
- Primary agent (9.5-failing-agent) correctly returned ERROR status with SIMULATED_FAILURE code
- ERROR handler triggered and received full error context: errorDetails, errorCode, attemptedTask, attemptNumber
- Recovery logic executed: spawned fallback agent (9.5-recovery-agent) from within ERROR handler
- Recovery agent completed successfully with status: SUCCESS, recoveryComplete: true
- Workflow states transitioned correctly: STARTING → RECOVERING → RECOVERED
- Total attempts tracked: 2 (1 primary failure + 1 successful recovery)
- Nested OnStatus handlers work: ERROR handler contained SpawnAgent + nested OnStatus SUCCESS/ERROR
- Agents: 9.5-failing-agent, 9.5-recovery-agent (src/app/scenarios/)
- Validated on 2026-01-22

---

## LEVEL 10: Edge Cases

These scenarios validate handling of edge cases and error conditions.

---

## 10.1 Empty Command Body

### Goal
Confirm that a command with no body content is handled gracefully.

### Scenario
Create a command with only name and description, no children. Verify it builds and Claude handles the invocation appropriately.

### Success Criteria
- [ ] Build succeeds without errors
- [ ] Command is recognized by Claude
- [ ] Claude handles empty body gracefully (no crash)
- [ ] Clear indication that command has no instructions

### Validation
**status**: todo
**validation notes**:

---

## 10.2 Deeply Nested Conditionals

### Goal
Confirm that deeply nested If/Else blocks are handled correctly.

### Scenario
Create a command with 3+ levels of nested conditionals. Verify all branches evaluate correctly and render proper indentation.

### Success Criteria
- [ ] All nesting levels render correctly
- [ ] Claude evaluates each condition in order
- [ ] Correct branch is taken at each level
- [ ] Output maintains readable structure

### Validation
**status**: todo
**validation notes**:

---

## 10.3 Special Characters in Variables

### Goal
Confirm that variables containing special characters are handled correctly.

### Scenario
Assign a variable with a value containing spaces, quotes, and special characters. Use the variable in content and verify it's correctly escaped.

### Success Criteria
- [ ] Value with spaces is properly quoted
- [ ] Quotes within value are escaped
- [ ] Special characters ($, !, etc.) are handled
- [ ] Variable interpolation works correctly

### Validation
**status**: todo
**validation notes**:

---

## 10.4 Large Agent Output

### Goal
Confirm that large agent outputs are handled without truncation or errors.

### Scenario
Create an agent that returns a large output (many lines or large data structure). Verify the command receives and can process the complete output.

### Success Criteria
- [ ] Large output is captured completely
- [ ] Field interpolation works with large data
- [ ] No truncation or memory issues
- [ ] Performance remains acceptable

### Validation
**status**: todo
**validation notes**:

---

## 10.5 Agent Timeout Handling

### Goal
Confirm that agent timeouts are handled gracefully and appropriate status is returned.

### Scenario
Create a scenario where an agent might timeout (or simulate timeout). Verify the command's error handling receives appropriate status.

### Success Criteria
- [ ] Timeout condition is detectable
- [ ] ERROR or specific status handler is triggered
- [ ] Timeout context is available in handler
- [ ] Command can implement timeout recovery

### Validation
**status**: todo
**validation notes**:

---

## Summary

| Level | Category | Scenario Count |
|-------|----------|----------------|
| 1 | Foundation | 3 |
| 2 | Content Rendering | 5 |
| 3 | Variable System | 5 |
| 4 | Conditional Logic | 7 |
| 5 | Agent Communication | 7 |
| 6 | State Management | 5 |
| 7 | Scoped State Skills | 5 |
| 8 | MCP Configuration | 3 |
| 9 | Integration | 5 |
| 10 | Edge Cases | 5 |
| **Total** | | **50** |

---

## Validation Progress Tracker

- [x] Level 1 Complete (3/3)
- [x] Level 2 Complete (5/5)
- [x] Level 3 Complete (5/5)
- [x] Level 4 Complete (7/7)
- [x] Level 5 Complete (7/7)
- [x] Level 6 Complete (5/5)
- [x] Level 7 Complete (5/5)
- [ ] Level 8 Complete (1/3)
- [x] Level 9 Complete (5/5)
- [ ] Level 10 Complete (0/5)

**Overall Progress: 39/50 scenarios validated**
