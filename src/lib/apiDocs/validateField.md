## `this.validateField(fieldName)`

Returns `true` if no errors were found when validating the field `fieldName`, otherwise an array of strings, where each string is an error message.

For example, if the field `email` must be an email:

```jsx
this.validateField('email');
// => ['Email must be an email.']
```
