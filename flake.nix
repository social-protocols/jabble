# inspired by https://ayats.org/blog/nix-rustup/

{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";

    # for `flake-utils.lib.eachSystem`
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ ];
          config.allowUnfree = false;
        };
      in
      {
        devShells = {
          default = pkgs.mkShellNoCC {
            buildInputs = with pkgs; [
              git
              just

              sqlite-interactive
              nodejs_20
              python3 # for node-gyp
              gcc # for node-gyp

              earthly
              docker
              flyctl

              # darwin.apple_sdk.frameworks.Security
            ];
          };
          build = pkgs.mkShellNoCC {
            buildInputs = with pkgs; [
              nodejs_20
              sqlite
              python3 # for node-gyp
              gcc # for node-gyp
            ];
          };
          production = pkgs.mkShellNoCC {
            buildInputs = with pkgs; [
              nodejs_20
              sqlite-interactive
              fuse3 # for litefs
              busybox # for swap tools
            ];
          };
        };
      }
    );
}


