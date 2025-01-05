const processMultilineString = (input: string): string => {
    // Check if input is empty or null
    if (!input || input.length === 0) {
        return '';
    }

    // Replace all newline characters with two spaces followed by a newline
    // This handles both \n and \r\n line endings
    // return input.replace(/\r?\n/g, '   <br />');
    return input.replace(/\r?\n/g,  '\n &nbsp;');
    
};

export default processMultilineString;