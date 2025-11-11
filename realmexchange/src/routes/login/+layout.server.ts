import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import * as auth from "$lib/server/auth";
