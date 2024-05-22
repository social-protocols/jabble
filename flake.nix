# inspired by https://ayats.org/blog/nix-rustup/

{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/ba733f8000925e837e30765f273fec153426403d";

    # for `flake-utils.lib.eachSystem`
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils }:
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
          default = with pkgs; mkShellNoCC {
            buildInputs = [
              git
              just

              sqlite-interactive
              nodejs_20

              earthly
              docker
              flyctl

              python3
              julia_19-bin

              # darwin.apple_sdk.frameworks.Security
            ];
          };
          build = with pkgs; mkShellNoCC {
            buildInputs = [
              diffutils
              julia_19-bin
              python3 # for node-gyp
              gcc
              gnumake
              gnused
              llvmPackages.libcxxStdenv
              llvmPackages.libcxx
              libcxxStdenv
              libcxx
              sqlite
              nodejs_20
            ];
          };
          base = with pkgs; mkShellNoCC {
            buildInputs = [
              julia_19-bin
              nodejs_20
              sqlite
              fuse3 # for litefs
              busybox
            ];
          };
        };
      }
    );
}


