# inspired by https://ayats.org/blog/nix-rustup/

{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/ba733f8000925e837e30765f273fec153426403d";

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
        juliabuild_packages = with pkgs; [
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
      in
      {
        devShells = {
          default = with pkgs; pkgs.mkShellNoCC {
            buildInputs = [
              git
              just

              sqlite-interactive
              nodejs_20

              earthly
              docker
              flyctl

              less
              fzf

              python3
              xcbuild
              julia_19-bin

              # darwin.apple_sdk.frameworks.Security
            ];
          };
          juliabuild = with pkgs; pkgs.mkShellNoCC {
            buildInputs = juliabuild_packages;
          };
        };
        packages = {
          base = pkgs.buildEnv {
            name = "base-image";
            paths = with pkgs; [
                julia_19-bin
                nodejs_20
                sqlite
                fuse3 # for litefs
            ];
          };
          juliabuild = pkgs.buildEnv {
            name = "juliabuild";
            paths = juliabuild_packages;
          };
        };
      }
    );
}


