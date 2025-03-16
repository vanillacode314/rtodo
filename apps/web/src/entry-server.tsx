// @refresh reload
import { ColorModeScript } from '@kobalte/core';
import { createHandler, StartServer } from '@solidjs/start/server';

export default createHandler(() => (
	<StartServer
		document={({ assets, children, scripts }) => (
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta content="width=device-width, initial-scale=1" name="viewport" />
					<link href="/favicon.ico" rel="icon" />
					{assets}
				</head>
				<body>
					<ColorModeScript storageType="cookie" />
					<div id="app">{children}</div>
					{scripts}
				</body>
			</html>
		)}
	/>
));
