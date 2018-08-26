const axios = require('axios');
const fs = require('fs');
const tmp = require('tmp');

const {app, BrowserWindow, Menu, Notification, ipcMain} = require('electron');
const path = require('path');
const url = require('url');

app.commandLine.appendSwitch('--enable-smooth-scrolling')

function createWindow(urlstr) {
  let win = new BrowserWindow({
    icon: 'resources/default.ico',
    transparent: true,
    frame: false
    // webPreferences: {
    //   blinkFeatures: ''
    // }
  });
  win.setMenu(null);
  win.loadURL(url.format ({
    pathname: path.join(__dirname, 'resources/index.html'),
    protocol: 'file:',
    slashes: true
  }))
  win.webContents.executeJavaScript(`loadurl("${urlstr}")`);
  return win;
}

function mogrify(path, callback) {
  let mogrify = require('child_process').spawn('resources/mogrify.exe',
    [path, '-define icon:auto-resize=64,48,32,16'])
  mogrify.on('exit', callback);
}

app.on('ready', function() {
  createWindow("https://google.com");
})

app.on('web-contents-created', function (webContentsCreatedEvent, contents) {
  if (contents.getType() === 'webview') {
    contents.on('new-window', function (event, urlstr) {
      let owner = event.sender.getOwnerBrowserWindow();
      let win = createWindow(urlstr);
      event.preventDefault();
    });

    contents.on('page-favicon-updated', function (event, faviconUrls) {
      let owner = event.sender.getOwnerBrowserWindow();
      if (faviconUrls.length >= 1) {
        axios({'url': faviconUrls[faviconUrls.length-1], 'responseType': 'stream'})
        .then(response => {
          tmp.file({prefix: 'simple-', postfix: '.ico'}, (err, path, fd, cleanupCallback) => {
            if (err) throw err;
            response.data.pipe(fs.createWriteStream(path));
            mogrify(path, () => {
              if(owner) {
                owner.setIcon(path);
              }
            })
          });
        }).catch(err => {
          console.log(err);
          if(owner) {
            owner.setIcon('resources/default.ico');
          }
        });
      } else {
        owner.setIcon('resources/default.ico');
      }
    });
  }
});

app.on('browser-window-created', function (e, win) {
  win.setMenu(null);
  // win.webContents.toggleDevTools();
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.code === 'Escape') {
        win.close();
      } else if (input.code === 'AltLeft') {
        win.webContents.executeJavaScript(`toggleOverlay()`);
      }
    }
  })
})

app.on('window-all-closed', function () {
  app.quit();
})
