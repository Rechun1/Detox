const exec = require('child-process-promise').exec;
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const IosDriver = require('./IosDriver');
const AppleSimUtils = require('../../../detox-common/lib/ios/AppleSimUtils');
const configuration = require('../configuration');
const environment = require('../../../detox-common/lib/utils/environment');
const FileArtifact = require('../../../detox-plugin-artifacts/lib/artifacts/FileArtifact');

class SimulatorDriver extends IosDriver {

  constructor(client) {
    super(client);
    this._applesimutils = new AppleSimUtils();
    this._recordings = {};
  }

  async prepare() {
    const detoxFrameworkPath = await environment.getFrameworkPath();

    if (!fs.existsSync(detoxFrameworkPath)) {
      throw new Error(`${detoxFrameworkPath} could not be found, this means either you changed a version of Xcode or Detox postinstall script was unsuccessful.
      To attempt a fix try running 'detox clean-framework-cache && detox build-framework-cache'`);
    }
  }

  async acquireFreeDevice(name) {
    const deviceId = await this._applesimutils.findDeviceUDID(name);
    await this.boot(deviceId);
    return deviceId;
  }

  async getBundleIdFromBinary(appPath) {
    try {
      const result = await exec(`/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "${path.join(appPath, 'Info.plist')}"`);
      const bundleId = _.trim(result.stdout);
      if (_.isEmpty(bundleId)) {
        throw new Error();
      }
      return bundleId;
    } catch (ex) {
      throw new Error(`field CFBundleIdentifier not found inside Info.plist of app binary at ${appPath}`);
    }
  }

  async boot(deviceId) {
    await this._applesimutils.boot(deviceId);
  }

  async installApp(deviceId, binaryPath) {
    await this._applesimutils.install(deviceId, binaryPath);
  }

  async uninstallApp(deviceId, bundleId) {
    await this._applesimutils.uninstall(deviceId, bundleId);
  }

  async launch(deviceId, bundleId, launchArgs) {
    return await this._applesimutils.launch(deviceId, bundleId, launchArgs);
  }

  async terminate(deviceId, bundleId) {
    await this._applesimutils.terminate(deviceId, bundleId);
  }

  async sendToHome(deviceId) {
    return await this._applesimutils.sendToHome(deviceId);
  }

  async shutdown(deviceId) {
    await this._applesimutils.shutdown(deviceId);
  }

  async setLocation(deviceId, lat, lon) {
    await this._applesimutils.setLocation(deviceId, lat, lon);
  }

  async setPermissions(deviceId, bundleId, permissions) {
    await this._applesimutils.setPermissions(deviceId, bundleId, permissions);
  }

  async resetContentAndSettings(deviceId) {
    return await this._applesimutils.resetContentAndSettings(deviceId);
  }

  validateDeviceConfig(deviceConfig) {
    if (!deviceConfig.binaryPath) {
      configuration.throwOnEmptyBinaryPath();
    }

    if (!deviceConfig.name) {
      configuration.throwOnEmptyName();
    }
  }

  getLogsPaths(deviceId) {
    const {stdout, stderr} = this._applesimutils.getLogsPaths(deviceId);
    return {
      stdout: new FileArtifact(stdout),
      stderr: new FileArtifact(stderr)
    };
  }

  async takeScreenshot(deviceId) {
    return new FileArtifact(await this._applesimutils.takeScreenshot(deviceId));
  }

  async startVideo(deviceId) {
    this._recordings[deviceId] = await this._applesimutils.startVideo(deviceId);
  }

  async stopVideo(deviceId) {
    const recording = this._recordings[deviceId];
    if (recording) {
      const video = await this._applesimutils.stopVideo(deviceId, recording);
      delete this._recordings[deviceId];
      return new FileArtifact(video);
    }
  }
}

module.exports = SimulatorDriver;
