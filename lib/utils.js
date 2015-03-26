/* */
import ts from 'typescript';

export function isAbsolute(filename) {
	return (filename[0] == '/');
}

export function isRelative(filename) {
	return (filename[0] == '.');
}

export function isAmbientImport(filename) {
	return (isAmbient(filename) && !isTypescriptDeclaration(filename));
}

export function isAmbientReference(filename) {
	return (isAmbient(filename) && isTypescriptDeclaration(filename));
}

export function isAmbient(filename) {
	return (!isRelative(filename) && !isAbsolute(filename));
}

export function isTypescript(file) {
	return (/\.ts$/i).test(file);
}

export function isTypescriptDeclaration(file) {
	return (/\.d\.ts$/i).test(file);
}

export function tsToJs(tsFile) {
	return tsFile.replace(/\.ts$/i, '.js');
}

export function tsToJsMap(tsFile) {
	return tsFile.replace(/\.ts$/i, '.js.map');
}

export function normalize(tsFile) {
	if (tsFile[0] != '/')
		tsFile = '/' + tsFile;
	return ts.normalizePath(tsFile);
}

export function toModule(tsFile) {
	if (isTypescriptDeclaration(tsFile))
		return tsFile.slice(0, -5);
	else
		return tsFile.slice(0, -3);
}
